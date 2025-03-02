// scripts/test-connection.js
const { connectDB, sequelize } = require('../config/database');

const testConnection = async () => {
  try {
    await connectDB();
    
    // Run a simple query
    const [results] = await sequelize.query('SELECT NOW()');
    console.log('PostgreSQL connection test successful:', results);
    
    await sequelize.close();
  } catch (error) {
    console.error('PostgreSQL connection test failed:', error);
  }
};

testConnection();