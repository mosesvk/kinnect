// config/pgConfig.js
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'familyapp',
  process.env.POSTGRES_USER || 'familyuser',
  process.env.POSTGRES_PASSWORD || 'yourpassword',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    port: process.env.POSTGRES_PORT || 5600,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const connectPG = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to PostgreSQL database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectPG };