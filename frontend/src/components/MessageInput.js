import React, { useState, useRef, useEffect } from 'react';
import { uploadAPI } from '../services/api';
import { socketEvents } from '../services/socket';

const MessageInput = ({ groupId, onSendMessage, replyingTo, onCancelReply }) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [poll, setPoll] = useState({ question: '', options: ['', ''] });
  const [showPollForm, setShowPollForm] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSend = async () => {
    if (!content.trim() && type === 'text' && !showPollForm) return;
    if (showPollForm && (!poll.question.trim() || poll.options.filter(o => o.trim()).length < 2)) {
      return;
    }

    const messageData = {
      groupId,
      type: showPollForm ? 'poll' : type,
      content: showPollForm ? '' : content,
      mediaUrl: type !== 'text' ? mediaUrl : '',
      poll: showPollForm ? {
        question: poll.question,
        options: poll.options.filter(o => o.trim()).map(o => ({ text: o.trim(), votes: [] })),
      } : undefined,
      repliedTo: replyingTo?._id || null,
    };

    socketEvents.sendMessage(messageData);
    onSendMessage();

    // Reset form
    setContent('');
    setType('text');
    setMediaUrl('');
    setPoll({ question: '', options: ['', ''] });
    setShowPollForm(false);
    if (onCancelReply) onCancelReply();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadAPI.uploadMedia(file);
      const url = response.data.url;

      // Determine type based on file
      if (file.type.startsWith('image/')) {
        setType('image');
      } else if (file.type.startsWith('video/')) {
        setType('video');
      } else if (file.type.startsWith('audio/')) {
        setType('audio');
      }

      setMediaUrl(url);
      setContent(file.name);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const addPollOption = () => {
    setPoll({ ...poll, options: [...poll.options, ''] });
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...poll.options];
    newOptions[index] = value;
    setPoll({ ...poll, options: newOptions });
  };

  const removePollOption = (index) => {
    if (poll.options.length > 2) {
      setPoll({ ...poll, options: poll.options.filter((_, i) => i !== index) });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {replyingTo && (
        <div className="mb-2 p-2 bg-gray-100 rounded flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Replying to {replyingTo.senderId?.username}</p>
            <p className="text-sm text-gray-700 truncate">{replyingTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      )}

      {showPollForm ? (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Poll question"
            value={poll.question}
            onChange={(e) => setPoll({ ...poll, question: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <div className="space-y-2">
            {poll.options.map((option, index) => (
              <div key={index} className="flex space-x-2">
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updatePollOption(index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
                {poll.options.length > 2 && (
                  <button
                    onClick={() => removePollOption(index)}
                    className="px-3 text-red-600 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addPollOption}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Add option
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowPollForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create Poll
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none max-h-32"
              rows={1}
              disabled={uploading || type !== 'text'}
            />
            {type !== 'text' && mediaUrl && (
              <div className="mt-2 p-2 bg-gray-100 rounded">
                <p className="text-sm text-gray-600">{content}</p>
                <button
                  onClick={() => {
                    setType('text');
                    setMediaUrl('');
                    setContent('');
                  }}
                  className="text-xs text-red-600 hover:text-red-700 mt-1"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
              title="Upload file"
              disabled={uploading}
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setShowPollForm(true)}
              className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
              title="Create poll"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>

            <button
              onClick={handleSend}
              disabled={(!content.trim() && type === 'text') || uploading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;

