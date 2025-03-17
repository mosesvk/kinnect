// src/models/PostEvent.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PostEvent = sequelize.define('PostEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Posts',
      key: 'id'
    }
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Events',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['postId', 'eventId'],
      unique: true
    }
  ]
});

module.exports = PostEvent;