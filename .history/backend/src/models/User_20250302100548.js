// src/models/User.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash) {
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash')) {
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
      }
    }
  }
});

// Match password method
User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Generate JWT token
User.prototype.generateToken = function() {
  return jwt.sign(
    { id: this.id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

module.exports = User;