// src/models/PostMedia.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PostMedia = sequelize.define('PostMedia', {
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
  mediaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Media',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['postId', 'mediaId'],
      unique: true
    }
  ]
});

module.exports = PostMedia;