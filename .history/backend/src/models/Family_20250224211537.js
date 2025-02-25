const mongoose = require('mongoose');
const crypto = require('crypto');

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
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    permissions: {
      type: [String],
      default: ['read']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    privacyLevel: {
      type: String,
      enum: ['public', 'private', 'invitation'],
      default: 'private'
    },
    notificationPreferences: {
      type: Object,
      default: {}
    }
  },
  invitationCode: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(6).toString('hex')
  },
  invitationExpiry: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days from now
  }
}, {
  timestamps: true
});

// Method to generate a new invitation code
familySchema.methods.generateInvitationCode = async function() {
  this.invitationCode = crypto.randomBytes(6).toString('hex');
  this.invitationExpiry = new Date(+new Date() + 30*24*60*60*1000); // 30 days from now
  await this.save();
  return this.invitationCode;
};

// Method to check if invitation code is valid
familySchema.methods.isInvitationValid = function() {
  return this.invitationExpiry > new Date();
};

const Family = mongoose.model('Family', familySchema);

module.exports = Family;