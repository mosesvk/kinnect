const User = require('./User');
// Import other models as needed

// Define model associations here
// Example: User.hasMany(Posts);

// Sync database
const syncDatabase = async (force = false) => {
  try {
    console.log(`Syncing database${force ? ' (force: true)' : ''}...`);
    await User.sync({ alter: true });
    // Sync other models as needed
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
};

module.exports = {
  User,
  // Export other models
  syncDatabase
};