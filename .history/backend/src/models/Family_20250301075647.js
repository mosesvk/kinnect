// models/Family.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const Family = sequelize.define('Family', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      privacyLevel: 'private',
      notificationPreferences: {}
    }
  },
  invitationCode: {
    type: DataTypes.STRING,
    unique: true,
    defaultValue: () => crypto.randomBytes(6).toString('hex')
  },
  invitationExpiry: {
    type: DataTypes.DATE,
    defaultValue: () => new Date(Date.now() + 30*24*60*60*1000) // 30 days from now
  }
}, {
  timestamps: true
});

// Instance methods
Family.prototype.generateInvitationCode = async function() {
  this.invitationCode = crypto.randomBytes(6).toString('hex');
  this.invitationExpiry = new Date(Date.now() + 30*24*60*60*1000);
  await this.save();
  return this.invitationCode;
};

Family.prototype.isInvitationValid = function() {
  return this.invitationExpiry > new Date();
};

module.exports = Family;