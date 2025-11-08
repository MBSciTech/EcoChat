import React, { useState, useEffect } from 'react';
import { groupsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { socketEvents } from '../services/socket';

const ChatList = ({ selectedGroup, onSelectGroup, onCreateGroup }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchGroups();

    // Listen for new groups
    socketEvents.onUserJoinedGroup((data) => {
      fetchGroups();
    });

    return () => {
      // Cleanup socket listeners if needed
    };
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await groupsAPI.getUserGroups();
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Groups</h2>
        <button
          onClick={onCreateGroup}
          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          title="Create Group"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No groups yet</p>
            <button
              onClick={onCreateGroup}
              className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groups.map((group) => (
              <div
                key={group._id}
                onClick={() => onSelectGroup(group)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedGroup?._id === group._id ? 'bg-primary-50 border-l-4 border-primary-600' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{group.description}</p>
                    )}
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="text-xs text-gray-400">
                        {group.members?.length || 0} members
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;

