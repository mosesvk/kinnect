// models/pg/index.js
const { sequelize } = require('../../config/pgConfig');
const User = require('./User');
const Family = require('./Family');
const UserFamily = require('./UserFamily');
// Import other models

const initializeDatabase = async () => {
  try {
    // Sync all models with database
    await sequelize.sync({ alter: true }); // Use { force: true } in development to recreate tables
    console.log('PostgreSQL database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing PostgreSQL database:', error);
  }
};

module.exports = {
  initializeDatabase,
  User,
  Family,
  UserFamily,
  // Export other models
};