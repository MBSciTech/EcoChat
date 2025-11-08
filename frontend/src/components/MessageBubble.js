import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const MessageBubble = ({ message, onReaction, onReply, onEdit, onDelete, isEditing, onSaveEdit, onCancelEdit }) => {
  const { user } = useAuth();
  const isOwn = message.senderId._id === (user._id || user.id);
  const [showReactions, setShowReactions] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onSaveEdit(editContent);
    } else {
      onCancelEdit();
    }
  };

  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    switch (message.type) {
      case 'image':
        return (
          <div>
            <img
              src={message.mediaUrl}
              alt={message.content || 'Image'}
              className="max-w-xs rounded-lg cursor-pointer"
              onClick={() => window.open(message.mediaUrl, '_blank')}
            />
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div>
            <video
              src={message.mediaUrl}
              controls
              className="max-w-xs rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div>
            <audio src={message.mediaUrl} controls className="w-full" />
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'poll':
        return (
          <div className="space-y-2">
            <p className="font-semibold">{message.poll.question}</p>
            <div className="space-y-2">
              {message.poll.options.map((option, index) => {
                const totalVotes = message.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                return (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
                      <span className="text-sm">{option.text}</span>
                      <span className="text-xs text-gray-600">
                        {option.votes.length} vote{option.votes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {totalVotes > 0 && (
                      <div className="absolute bottom-0 left-0 h-1 bg-primary-600 rounded" style={{ width: `${percentage}%` }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
        {!isOwn && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
              {message.senderId.username?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && (
            <span className="text-xs text-gray-500 mb-1">{message.senderId.username}</span>
          )}

          <div
            className={`rounded-lg px-4 py-2 ${
              isOwn
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {renderMessageContent()}

            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(
                  message.reactions.reduce((acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([emoji, count]) => (
                  <span
                    key={emoji}
                    className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded"
                  >
                    {emoji} {count}
                  </span>
                ))}
              </div>
            )}

            <div className={`flex items-center mt-1 space-x-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-xs opacity-70">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </span>
              {message.updatedAt && message.createdAt !== message.updatedAt && (
                <span className="text-xs opacity-70">(edited)</span>
              )}
            </div>
          </div>

          <div className="flex items-center mt-1 space-x-2">
            {isOwn && (
              <>
                <button
                  onClick={() => onReaction(message._id)}
                  className="text-xs text-gray-500 hover:text-primary-600"
                  title="Add reaction"
                >
                  😊
                </button>
                {message.type === 'text' && (
                  <button
                    onClick={() => onEdit(message._id)}
                    className="text-xs text-gray-500 hover:text-primary-600"
                    title="Edit"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => onDelete(message._id)}
                  className="text-xs text-gray-500 hover:text-red-600"
                  title="Delete"
                >
                  Delete
                </button>
              </>
            )}
            {!isOwn && (
              <button
                onClick={() => onReply(message)}
                className="text-xs text-gray-500 hover:text-primary-600"
                title="Reply"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

