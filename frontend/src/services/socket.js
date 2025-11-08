import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  return socket;
};

// Socket event helpers
export const socketEvents = {
  // Connection
  connect: (callback) => socket?.on('connect', callback),
  disconnect: (callback) => socket?.on('disconnect', callback),
  error: (callback) => socket?.on('error', callback),

  // Groups
  joinGroups: () => socket?.emit('join-groups'),
  joinGroup: (groupId) => socket?.emit('join-group', groupId),
  leaveGroup: (groupId) => socket?.emit('leave-group', groupId),
  onJoinedGroup: (callback) => socket?.on('joined-group', callback),
  onUserJoinedGroup: (callback) => socket?.on('user-joined-group', callback),
  onLeftGroup: (callback) => socket?.on('left-group', callback),

  // Messages
  sendMessage: (data) => socket?.emit('send-message', data),
  onNewMessage: (callback) => socket?.on('new-message', callback),
  onMessageEdited: (callback) => socket?.on('message-edited', callback),
  onMessageDeleted: (callback) => socket?.on('message-deleted', callback),

  // Typing
  startTyping: (groupId) => socket?.emit('typing-start', groupId),
  stopTyping: (groupId) => socket?.emit('typing-stop', groupId),
  onUserTyping: (callback) => socket?.on('user-typing', callback),
  onUserStoppedTyping: (callback) => socket?.on('user-stopped-typing', callback),

  // Message Status
  markDelivered: (messageId) => socket?.emit('message-delivered', { messageId }),
  markSeen: (messageId) => socket?.emit('message-seen', { messageId }),
  markGroupSeen: (groupId) => socket?.emit('mark-group-seen', groupId),
  onMessageStatusUpdated: (callback) => socket?.on('message-status-updated', callback),

  // Reactions
  addReaction: (messageId, emoji) => socket?.emit('add-reaction', { messageId, emoji }),
  removeReaction: (messageId, emoji) => socket?.emit('remove-reaction', { messageId, emoji }),
  onReactionAdded: (callback) => socket?.on('reaction-added', callback),
  onReactionRemoved: (callback) => socket?.on('reaction-removed', callback),

  // Polls
  votePoll: (messageId, optionIndex) => socket?.emit('vote-poll', { messageId, optionIndex }),
  onPollVoted: (callback) => socket?.on('poll-voted', callback),

  // Edit/Delete
  editMessage: (messageId, content) => socket?.emit('edit-message', { messageId, content }),
  deleteMessage: (messageId) => socket?.emit('delete-message', { messageId }),

  // Presence
  getOnlineUsers: (groupId) => socket?.emit('get-online-users', groupId),
  onOnlineUsers: (callback) => socket?.on('online-users', callback),
};

export default socket;

