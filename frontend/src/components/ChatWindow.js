import React, { useState, useEffect, useRef } from 'react';
import { messagesAPI } from '../services/api';
import { socketEvents } from '../services/socket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { useAuth } from '../contexts/AuthContext';

const ChatWindow = ({ group }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const { user } = useAuth();
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!group) return;

    // Join group socket room
    socketEvents.joinGroup(group._id);

    // Load messages
    loadMessages();

    // Set up socket listeners
    const handleNewMessage = (data) => {
      if (data.message.groupId === group._id) {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
        // Mark as delivered
        socketEvents.markDelivered(data.message._id);
      }
    };

    const handleMessageEdited = (data) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === data.messageId ? data.message : msg))
      );
    };

    const handleMessageDeleted = (data) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
    };

    const handleUserTyping = (data) => {
      if (data.groupId === group._id && data.userId !== (user._id || user.id)) {
        setTypingUsers((prev) => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (data.groupId === group._id) {
        setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
      }
    };

    const handleReactionAdded = (data) => {
      if (data.message.groupId === group._id) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === data.messageId ? data.message : msg))
        );
      }
    };

    const handleReactionRemoved = (data) => {
      if (data.message.groupId === group._id) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === data.messageId ? data.message : msg))
        );
      }
    };

    const handlePollVoted = (data) => {
      if (data.message.groupId === group._id) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === data.messageId ? data.message : msg))
        );
      }
    };

    socketEvents.onNewMessage(handleNewMessage);
    socketEvents.onMessageEdited(handleMessageEdited);
    socketEvents.onMessageDeleted(handleMessageDeleted);
    socketEvents.onUserTyping(handleUserTyping);
    socketEvents.onUserStoppedTyping(handleUserStoppedTyping);
    socketEvents.onReactionAdded(handleReactionAdded);
    socketEvents.onReactionRemoved(handleReactionRemoved);
    socketEvents.onPollVoted(handlePollVoted);

    // Mark group as seen
    socketEvents.markGroupSeen(group._id);

    return () => {
      // Cleanup
      socketEvents.leaveGroup(group._id);
    };
  }, [group?._id]);

  const loadMessages = async (pageNum = 1) => {
    try {
      const response = await messagesAPI.getMessages(group._id, pageNum, 50);
      const newMessages = response.data.messages;

      if (pageNum === 1) {
        setMessages(newMessages);
      } else {
        setMessages((prev) => [...newMessages, ...prev]);
      }

      setHasMore(response.data.pagination.pages > pageNum);
      setPage(pageNum);

      if (pageNum === 1) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !loading) {
      loadMessages(page + 1);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    scrollToBottom();
  };

  const handleReaction = (messageId) => {
    const emoji = prompt('Enter emoji:');
    if (emoji) {
      socketEvents.addReaction(messageId, emoji);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleEdit = (messageId) => {
    setEditingMessageId(messageId);
  };

  const handleSaveEdit = async (content) => {
    try {
      socketEvents.editMessage(editingMessageId, content);
      setEditingMessageId(null);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
  };

  const handleDelete = (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      socketEvents.deleteMessage(messageId);
    }
  };

  const handleTyping = () => {
    socketEvents.startTyping(group._id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketEvents.stopTyping(group._id);
    }, 3000);
  };

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg">Select a group to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h2 className="text-xl font-semibold text-gray-800">{group.name}</h2>
        {group.description && (
          <p className="text-sm text-gray-500 mt-1">{group.description}</p>
        )}
        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
          <span>{group.members?.length || 0} members</span>
          {typingUsers.length > 0 && (
            <span className="text-primary-600">
              {typingUsers.length} {typingUsers.length === 1 ? 'person is' : 'people are'} typing...
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={(e) => {
          if (e.target.scrollTop === 0 && hasMore) {
            loadMoreMessages();
          }
        }}
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMoreMessages}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Load older messages
                </button>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble
                key={message._id}
                message={message}
                onReaction={handleReaction}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isEditing={editingMessageId === message._id}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        groupId={group._id}
        onSendMessage={handleSendMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
};

export default ChatWindow;

