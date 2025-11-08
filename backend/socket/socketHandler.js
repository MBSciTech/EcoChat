const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');
const { authenticateSocket } = require('../middleware/auth');

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId
const typingUsers = new Map(); // groupId -> Set of userIds

const initializeSocket = (io) => {
  // Authentication middleware for Socket.io
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const user = socket.user;

    console.log(`User connected: ${user.username} (${userId})`);

    // Store user connection
    activeUsers.set(userId.toString(), socket.id);
    userSockets.set(socket.id, userId.toString());

    // Update user status to online
    User.findByIdAndUpdate(userId, {
      status: 'online',
      lastSeen: new Date(),
    }).catch(err => console.error('Error updating user status:', err));

    // Join user to their groups
    socket.on('join-groups', async () => {
      try {
        const userGroups = await Group.find({ members: userId });
        userGroups.forEach(group => {
          socket.join(`group:${group._id}`);
        });
        console.log(`User ${user.username} joined ${userGroups.length} groups`);
      } catch (error) {
        console.error('Error joining groups:', error);
      }
    });

    // Join a specific group
    socket.on('join-group', async (groupId) => {
      try {
        const group = await Group.findById(groupId);
        if (group && group.members.includes(userId)) {
          socket.join(`group:${groupId}`);
          socket.emit('joined-group', { groupId });
          
          // Notify others in the group
          socket.to(`group:${groupId}`).emit('user-joined-group', {
            groupId,
            user: {
              id: user._id,
              username: user.username,
              avatarUrl: user.avatarUrl,
            },
          });
        } else {
          socket.emit('error', { message: 'Group not found or you are not a member' });
        }
      } catch (error) {
        console.error('Error joining group:', error);
        socket.emit('error', { message: 'Error joining group' });
      }
    });

    // Leave a group
    socket.on('leave-group', (groupId) => {
      socket.leave(`group:${groupId}`);
      socket.emit('left-group', { groupId });
    });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { groupId, type, content, mediaUrl, poll, repliedTo } = data;

        // Verify user is a member of the group
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(userId)) {
          return socket.emit('error', { message: 'You are not a member of this group' });
        }

        // Create message
        const message = new Message({
          groupId,
          senderId: userId,
          type: type || 'text',
          content: content || '',
          mediaUrl: mediaUrl || '',
          poll: poll || undefined,
          repliedTo: repliedTo || null,
          status: {
            sent: [],
            delivered: [],
            seen: [],
          },
        });

        // Initialize status for all group members
        group.members.forEach(memberId => {
          if (memberId.toString() !== userId.toString()) {
            message.status.sent.push(memberId);
          }
        });

        await message.save();

        // Add message to group
        group.messages.push(message._id);
        await group.save();

        // Populate message data
        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'username email avatarUrl')
          .populate('repliedTo', 'content type senderId')
          .populate('reactions.userId', 'username avatarUrl');

        // Emit to all members of the group
        io.to(`group:${groupId}`).emit('new-message', {
          message: populatedMessage,
        });

        // Stop typing indicator
        stopTyping(socket, groupId);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Typing indicator
    socket.on('typing-start', (groupId) => {
      if (!typingUsers.has(groupId)) {
        typingUsers.set(groupId, new Set());
      }
      typingUsers.get(groupId).add(userId.toString());

      socket.to(`group:${groupId}`).emit('user-typing', {
        groupId,
        userId: userId.toString(),
        username: user.username,
      });
    });

    socket.on('typing-stop', (groupId) => {
      stopTyping(socket, groupId);
    });

    // Message status updates
    socket.on('message-delivered', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);
        
        if (message) {
          await message.updateStatus('delivered', userId);
          
          // Notify sender
          const senderSocketId = activeUsers.get(message.senderId.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message-status-updated', {
              messageId,
              status: 'delivered',
              userId: userId.toString(),
            });
          }
        }
      } catch (error) {
        console.error('Error updating message status:', error);
      }
    });

    socket.on('message-seen', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);
        
        if (message) {
          await message.updateStatus('seen', userId);
          
          // Notify sender
          const senderSocketId = activeUsers.get(message.senderId.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message-status-updated', {
              messageId,
              status: 'seen',
              userId: userId.toString(),
            });
          }
        }
      } catch (error) {
        console.error('Error updating message status:', error);
      }
    });

    // Mark all messages in group as seen
    socket.on('mark-group-seen', async (groupId) => {
      try {
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(userId)) {
          return;
        }

        // Get all messages in group that user hasn't seen
        const messages = await Message.find({
          groupId,
          senderId: { $ne: userId },
          deleted: false,
          'status.seen': { $ne: userId },
        });

        // Update status for all messages
        for (const message of messages) {
          await message.updateStatus('seen', userId);
          
          // Notify sender
          const senderSocketId = activeUsers.get(message.senderId.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message-status-updated', {
              messageId: message._id,
              status: 'seen',
              userId: userId.toString(),
            });
          }
        }
      } catch (error) {
        console.error('Error marking group as seen:', error);
      }
    });

    // Add reaction
    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, emoji } = data;
        const message = await Message.findById(messageId);
        
        if (message) {
          await message.addReaction(emoji, userId);
          
          const populatedMessage = await Message.findById(messageId)
            .populate('senderId', 'username email avatarUrl')
            .populate('reactions.userId', 'username avatarUrl');

          io.to(`group:${message.groupId.toString()}`).emit('reaction-added', {
            messageId,
            message: populatedMessage,
          });
        }
      } catch (error) {
        console.error('Error adding reaction:', error);
        socket.emit('error', { message: 'Error adding reaction' });
      }
    });

    // Remove reaction
    socket.on('remove-reaction', async (data) => {
      try {
        const { messageId, emoji } = data;
        const message = await Message.findById(messageId);
        
        if (message) {
          await message.removeReaction(emoji, userId);
          
          const populatedMessage = await Message.findById(messageId)
            .populate('senderId', 'username email avatarUrl')
            .populate('reactions.userId', 'username avatarUrl');

          io.to(`group:${message.groupId.toString()}`).emit('reaction-removed', {
            messageId,
            message: populatedMessage,
          });
        }
      } catch (error) {
        console.error('Error removing reaction:', error);
        socket.emit('error', { message: 'Error removing reaction' });
      }
    });

    // Vote on poll
    socket.on('vote-poll', async (data) => {
      try {
        const { messageId, optionIndex } = data;
        const message = await Message.findById(messageId);
        
        if (!message || message.type !== 'poll') {
          return socket.emit('error', { message: 'Message is not a poll' });
        }

        await message.votePoll(optionIndex, userId);
        
        const populatedMessage = await Message.findById(messageId)
          .populate('senderId', 'username email avatarUrl')
          .populate('poll.options.votes', 'username avatarUrl');

        io.to(`group:${message.groupId.toString()}`).emit('poll-voted', {
          messageId,
          message: populatedMessage,
        });
      } catch (error) {
        console.error('Error voting on poll:', error);
        socket.emit('error', { message: 'Error voting on poll' });
      }
    });

    // Edit message
    socket.on('edit-message', async (data) => {
      try {
        const { messageId, content } = data;
        const message = await Message.findById(messageId);
        
        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        if (message.senderId.toString() !== userId.toString()) {
          return socket.emit('error', { message: 'You can only edit your own messages' });
        }

        if (message.type === 'poll' || message.type === 'image' || message.type === 'video' || message.type === 'audio') {
          return socket.emit('error', { message: 'Cannot edit this type of message' });
        }

        message.content = content;
        message.updatedAt = new Date();
        await message.save();

        const populatedMessage = await Message.findById(messageId)
          .populate('senderId', 'username email avatarUrl')
          .populate('repliedTo', 'content type senderId')
          .populate('reactions.userId', 'username avatarUrl');

        io.to(`group:${message.groupId.toString()}`).emit('message-edited', {
          messageId,
          message: populatedMessage,
        });
      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('error', { message: 'Error editing message' });
      }
    });

    // Delete message
    socket.on('delete-message', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);
        
        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        const group = await Group.findById(message.groupId);
        const isSender = message.senderId.toString() === userId.toString();
        const isAdmin = group.admins.includes(userId);

        if (!isSender && !isAdmin) {
          return socket.emit('error', { message: 'You can only delete your own messages or be an admin' });
        }

        message.deleted = true;
        message.deletedAt = new Date();
        await message.save();

        io.to(`group:${message.groupId.toString()}`).emit('message-deleted', {
          messageId,
        });
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Error deleting message' });
      }
    });

    // Get online users in a group
    socket.on('get-online-users', async (groupId) => {
      try {
        const group = await Group.findById(groupId).populate('members', 'username avatarUrl status');
        if (!group || !group.members.some(m => m._id.toString() === userId.toString())) {
          return socket.emit('error', { message: 'You are not a member of this group' });
        }

        const onlineMembers = group.members.filter(member => {
          return activeUsers.has(member._id.toString());
        });

        socket.emit('online-users', {
          groupId,
          users: onlineMembers.map(m => ({
            id: m._id,
            username: m.username,
            avatarUrl: m.avatarUrl,
            status: m.status,
          })),
        });
      } catch (error) {
        console.error('Error getting online users:', error);
        socket.emit('error', { message: 'Error getting online users' });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.username} (${userId})`);

      // Remove from active users
      activeUsers.delete(userId.toString());
      userSockets.delete(socket.id);

      // Update user status to offline
      User.findByIdAndUpdate(userId, {
        status: 'offline',
        lastSeen: new Date(),
      }).catch(err => console.error('Error updating user status:', err));

      // Stop typing in all groups
      typingUsers.forEach((userSet, groupId) => {
        if (userSet.has(userId.toString())) {
          userSet.delete(userId.toString());
          socket.to(`group:${groupId}`).emit('user-stopped-typing', {
            groupId,
            userId: userId.toString(),
          });
        }
      });
    });
  });

  // Helper function to stop typing
  const stopTyping = (socket, groupId) => {
    if (typingUsers.has(groupId)) {
      typingUsers.get(groupId).delete(socket.userId.toString());
      socket.to(`group:${groupId}`).emit('user-stopped-typing', {
        groupId,
        userId: socket.userId.toString(),
      });
    }
  };
};

module.exports = initializeSocket;

