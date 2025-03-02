// scripts/test-connection.js
const { connectDb, sequelize } = require('../src/config/db')

const testConnection = async () => {
  try {
    await connectDb();
    
    // Run a simple query
    const [results] = await sequelize.query('SELECT NOW()');
    console.log('PostgreSQL connection test successful:', results);
    
    await sequelize.close();
  } catch (error) {
    console.error('PostgreSQL connection test failed:', error);
  }
};

testConnection();