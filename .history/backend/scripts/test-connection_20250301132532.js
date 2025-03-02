// test-db.js
const { sequelize } = require('./config/db');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection successful');
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();