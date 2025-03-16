// Improved Family.js model with proper associations
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Define the Family model
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      privacyLevel: 'private',
      notificationPreferences: {
        events: true,
        tasks: true,
        documents: true
      }
    }
  }
}, {
  tableName: 'Families', // Explicitly set table name
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define FamilyMember as a separate model
const FamilyMember = sequelize.define('FamilyMember', {
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
    },
    onDelete: 'CASCADE' // Add cascade delete
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'member'
  },
  permissions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: ['view']
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'FamilyMembers', // Explicitly set table name
  timestamps: true
});

// Important: Export the models first, then define associations
module.exports = { Family, FamilyMember };

// The associations should be defined in a separate file (like models/index.js)
// after all models have been loaded to avoid circular dependencies