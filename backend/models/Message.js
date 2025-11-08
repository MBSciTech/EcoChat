const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'poll', 'emoji'],
    required: true,
    default: 'text',
  },
  content: {
    type: String,
    trim: true,
    maxlength: 5000,
    default: '',
  },
  mediaUrl: {
    type: String,
    default: '',
  },
  poll: {
    question: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    options: [{
      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      votes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
    }],
  },
  reactions: [{
    emoji: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  }],
  repliedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  status: {
    sent: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    delivered: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    seen: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ deleted: 1 });

// Virtual for checking if message is a poll
messageSchema.virtual('isPoll').get(function() {
  return this.type === 'poll' && this.poll && this.poll.question;
});

// Method to add reaction
messageSchema.methods.addReaction = function(emoji, userId) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );
  // Add new reaction
  this.reactions.push({ emoji, userId });
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(emoji, userId) {
  this.reactions = this.reactions.filter(
    r => !(r.emoji === emoji && r.userId.toString() === userId.toString())
  );
  return this.save();
};

// Method to vote on poll
messageSchema.methods.votePoll = function(optionIndex, userId) {
  if (this.type !== 'poll' || !this.poll) {
    throw new Error('Message is not a poll');
  }
  
  // Remove user's vote from all options
  this.poll.options.forEach(option => {
    option.votes = option.votes.filter(
      vote => vote.toString() !== userId.toString()
    );
  });
  
  // Add vote to selected option
  if (this.poll.options[optionIndex]) {
    this.poll.options[optionIndex].votes.push(userId);
  }
  
  return this.save();
};

// Method to update message status
messageSchema.methods.updateStatus = function(statusType, userId) {
  if (!['sent', 'delivered', 'seen'].includes(statusType)) {
    throw new Error('Invalid status type');
  }
  
  const statusArray = this.status[statusType];
  if (!statusArray.includes(userId)) {
    statusArray.push(userId);
    
    // If seen, also add to delivered
    if (statusType === 'seen' && !this.status.delivered.includes(userId)) {
      this.status.delivered.push(userId);
    }
    // If delivered, also add to sent
    if (statusType === 'delivered' && !this.status.sent.includes(userId)) {
      this.status.sent.push(userId);
    }
  }
  
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);

