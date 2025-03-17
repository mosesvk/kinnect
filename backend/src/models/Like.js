// src/models/Like.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Using a polymorphic association pattern
  targetType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['post', 'comment']]
    }
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reaction: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'like',
    validate: {
      isIn: [['like', 'love', 'laugh', 'wow', 'sad', 'angry']]
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['targetType', 'targetId']
    },
    {
      // Ensure a user can only have one reaction per target
      fields: ['userId', 'targetType', 'targetId'],
      unique: true
    }
  ]
});

module.exports = Like;