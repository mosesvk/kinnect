// src/models/PostFamily.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PostFamily = sequelize.define('PostFamily', {
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
  familyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Families',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['postId', 'familyId'],
      unique: true
    }
  ]
});

module.exports = PostFamily;