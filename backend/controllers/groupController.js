const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');

// Create a new group
const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.userId;

    const group = new Group({
      name,
      description: description || '',
      createdBy: userId,
    });

    await group.save();

    // Add group to user's groups array
    await User.findByIdAndUpdate(userId, {
      $addToSet: { groups: group._id },
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'username email avatarUrl')
      .populate('members', 'username email avatarUrl status')
      .populate('admins', 'username email avatarUrl');

    res.status(201).json({
      message: 'Group created successfully',
      group: populatedGroup,
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error creating group' });
  }
};

// Get all groups for a user
const getUserGroups = async (req, res) => {
  try {
    const userId = req.userId;

    const groups = await Group.find({ members: userId })
      .populate('createdBy', 'username email avatarUrl')
      .populate('members', 'username email avatarUrl status')
      .populate('admins', 'username email avatarUrl')
      .sort({ updatedAt: -1 });

    res.json({ groups });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
};

// Get single group by ID
const getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId)
      .populate('createdBy', 'username email avatarUrl')
      .populate('members', 'username email avatarUrl status')
      .populate('admins', 'username email avatarUrl');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    if (!group.members.some(m => m._id.toString() === userId.toString())) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error fetching group' });
  }
};

// Join a group
const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }

    // Add user to members
    group.members.push(userId);
    await group.save();

    // Add group to user's groups array
    await User.findByIdAndUpdate(userId, {
      $addToSet: { groups: group._id },
    });

    const populatedGroup = await Group.findById(groupId)
      .populate('createdBy', 'username email avatarUrl')
      .populate('members', 'username email avatarUrl status')
      .populate('admins', 'username email avatarUrl');

    res.json({
      message: 'Successfully joined group',
      group: populatedGroup,
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error joining group' });
  }
};

// Leave a group
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: 'You are not a member of this group' });
    }

    // Remove user from members and admins
    group.members = group.members.filter(
      memberId => memberId.toString() !== userId.toString()
    );
    group.admins = group.admins.filter(
      adminId => adminId.toString() !== userId.toString()
    );
    await group.save();

    // Remove group from user's groups array
    await User.findByIdAndUpdate(userId, {
      $pull: { groups: group._id },
    });

    res.json({ message: 'Successfully left group' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ message: 'Server error leaving group' });
  }
};

// Add member to group (admin only)
const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: newMemberId } = req.body;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.admins.includes(userId)) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Check if user is already a member
    if (group.members.includes(newMemberId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Add user to members
    group.members.push(newMemberId);
    await group.save();

    // Add group to user's groups array
    await User.findByIdAndUpdate(newMemberId, {
      $addToSet: { groups: group._id },
    });

    const populatedGroup = await Group.findById(groupId)
      .populate('members', 'username email avatarUrl status')
      .populate('admins', 'username email avatarUrl');

    res.json({
      message: 'Member added successfully',
      group: populatedGroup,
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error adding member' });
  }
};

// Remove member from group (admin only)
const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.admins.includes(userId)) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    // Cannot remove yourself
    if (memberId === userId.toString()) {
      return res.status(400).json({ message: 'Cannot remove yourself from group' });
    }

    // Remove user from members and admins
    group.members = group.members.filter(
      id => id.toString() !== memberId
    );
    group.admins = group.admins.filter(
      id => id.toString() !== memberId
    );
    await group.save();

    // Remove group from user's groups array
    await User.findByIdAndUpdate(memberId, {
      $pull: { groups: group._id },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
};

// Update group (admin only)
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.admins.includes(userId)) {
      return res.status(403).json({ message: 'Only admins can update group' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate('createdBy', 'username email avatarUrl')
      .populate('members', 'username email avatarUrl status')
      .populate('admins', 'username email avatarUrl');

    res.json({
      message: 'Group updated successfully',
      group: populatedGroup,
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error updating group' });
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroup,
  joinGroup,
  leaveGroup,
  addMember,
  removeMember,
  updateGroup,
};

