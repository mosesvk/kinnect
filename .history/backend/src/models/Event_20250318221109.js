// models/Event.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  familyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Families',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW // Initialize to current date/time
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true, // Explicitly allow null
    defaultValue: null
  },
  location: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'general'
  },
  recurring: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  reminders: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['familyId', 'startDate']
    },
    {
      fields: ['category']
    }
  ]
});

module.exports = Event;