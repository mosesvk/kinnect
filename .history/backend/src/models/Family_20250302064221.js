const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

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
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define FamilyMember as a through table for User-Family relationship
const FamilyMember = sequelize.define('FamilyMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  familyId: {
    type: DataTypes.UUID,
    references: {
      model: 'Families',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
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
});

// Define the relationships
User.belongsToMany(Family, { through: FamilyMember, foreignKey: 'userId' });
Family.belongsToMany(User, { through: FamilyMember, foreignKey: 'familyId' });

Family.hasMany(FamilyMember);
FamilyMember.belongsTo(Family);

User.hasMany(FamilyMember);
FamilyMember.belongsTo(User);

module.exports = { Family, FamilyMember };