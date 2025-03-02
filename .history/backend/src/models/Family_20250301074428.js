// models/pg/Family.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/pgConfig');

const Family = sequelize.define('Family', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  invitationCode: {
    type: DataTypes.STRING,
    unique: true,
  },
  invitationExpiry: {
    type: DataTypes.DATE,
  },
  privacyLevel: {
    type: DataTypes.STRING,
    defaultValue: 'private',
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  timestamps: true,
});

module.exports = Family;