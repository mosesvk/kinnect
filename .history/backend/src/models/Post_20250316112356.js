// src/models/Post.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  mediaUrls: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'regular',
    validate: {
      isIn: [['regular', 'memory', 'milestone', 'announcement']]
    }
  },
  privacy: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'family',
    validate: {
      isIn: [['family', 'public', 'private']]
    }
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  location: {
    type: DataTypes.JSONB,
    defaultValue: null
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
      fields: ['createdById']
    },
    {
      fields: ['type']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = Post;