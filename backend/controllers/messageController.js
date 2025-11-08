const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');

// Get messages for a group with pagination
const getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Get messages
    const messages = await Message.find({
      groupId,
      deleted: false,
    })
      .populate('senderId', 'username email avatarUrl')
      .populate('repliedTo', 'content type senderId')
      .populate('reactions.userId', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Reverse to get chronological order
    messages.reverse();

    // Get total count
    const total = await Message.countDocuments({ groupId, deleted: false });

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
};

// Get single message
const getMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const message = await Message.findById(messageId)
      .populate('senderId', 'username email avatarUrl')
      .populate('repliedTo', 'content type senderId')
      .populate('reactions.userId', 'username avatarUrl');

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is a member of the group
    const group = await Group.findById(message.groupId);
    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    res.json({ message });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ message: 'Server error fetching message' });
  }
};

// Edit message
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    // Can't edit polls or media messages
    if (message.type === 'poll' || message.type === 'image' || message.type === 'video' || message.type === 'audio') {
      return res.status(400).json({ message: 'Cannot edit this type of message' });
    }

    message.content = content;
    message.updatedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(messageId)
      .populate('senderId', 'username email avatarUrl')
      .populate('repliedTo', 'content type senderId')
      .populate('reactions.userId', 'username avatarUrl');

    res.json({
      message: 'Message updated successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error editing message' });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender or admin
    const group = await Group.findById(message.groupId);
    const isSender = message.senderId.toString() === userId.toString();
    const isAdmin = group.admins.includes(userId);

    if (!isSender && !isAdmin) {
      return res.status(403).json({ message: 'You can only delete your own messages or be an admin' });
    }

    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error deleting message' });
  }
};

// Add reaction to message
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.addReaction(emoji, userId);

    const populatedMessage = await Message.findById(messageId)
      .populate('senderId', 'username email avatarUrl')
      .populate('reactions.userId', 'username avatarUrl');

    res.json({
      message: 'Reaction added successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Server error adding reaction' });
  }
};

// Remove reaction from message
const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.removeReaction(emoji, userId);

    const populatedMessage = await Message.findById(messageId)
      .populate('senderId', 'username email avatarUrl')
      .populate('reactions.userId', 'username avatarUrl');

    res.json({
      message: 'Reaction removed successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ message: 'Server error removing reaction' });
  }
};

// Vote on poll
const votePoll = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.type !== 'poll') {
      return res.status(400).json({ message: 'Message is not a poll' });
    }

    await message.votePoll(optionIndex, userId);

    const populatedMessage = await Message.findById(messageId)
      .populate('senderId', 'username email avatarUrl')
      .populate('poll.options.votes', 'username avatarUrl');

    res.json({
      message: 'Vote recorded successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Vote poll error:', error);
    res.status(500).json({ message: 'Server error voting on poll' });
  }
};

module.exports = {
  getMessages,
  getMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  votePoll,
};

