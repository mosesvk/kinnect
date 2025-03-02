
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// Check if environment variables are being loaded correctly
console.log('Database config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  name: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const sequelize = new Sequelize(
  process.env.DB_NAME || 'familyapp', // This is falling back to your username
  process.env.DB_USER || 'familyuser',
  process.env.DB_PASSWORD || 'yourpassword',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Rest of the code...