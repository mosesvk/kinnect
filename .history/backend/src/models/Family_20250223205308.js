const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'member', 'guardian', 'child']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    permissions: [{
      type: String,
      enum: ['read', 'write', 'delete', 'manage']
    }]
  }],
  settings: {
    privacyLevel: {
      type: String,
      enum: ['private', 'friends', 'public'],
      default: 'private'
    },
    notificationPreferences: {
      type: Map,
      of: Boolean,
      default: {
        events: true,
        tasks: true,
        documents: true,
        messages: true
      }
    }
  }
}, {
  timestamps: true
});

// Indexes
familySchema.index({ name: 1 });
familySchema.index({ 'members.userId': 1 });

// Methods
familySchema.methods.isMember = function(userId) {
  return this.members.some(member => member.userId.equals(userId));
};

familySchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member => member.userId.equals(userId));
  return member ? member.role : null;
};

// Statics
familySchema.statics.findByMember = function(userId) {
  return this.find({ 'members.userId': userId });
};

const Family = mongoose.model('Family', familySchema);

module.exports = Family;