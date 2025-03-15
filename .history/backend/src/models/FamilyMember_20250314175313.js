// src/models/Index.js
const User = require('./User');
const { Family, FamilyMember } = require('./Family');
const Event = require('./Event');
const EventAttendee = require('./EventAttendee');
// Import other models as needed

// Define model associations here (many are already defined in the model files)

// Additional associations
User.hasMany(Event, { foreignKey: 'createdById', as: 'createdEvents' });
Event.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });

Family.hasMany(Event, { foreignKey: 'familyId' });
Event.belongsTo(Family, { foreignKey: 'familyId' });

Event.hasMany(EventAttendee, { foreignKey: 'eventId' });
EventAttendee.belongsTo(Event, { foreignKey: 'eventId' });

User.hasMany(EventAttendee, { foreignKey: 'userId' });
EventAttendee.belongsTo(User, { foreignKey: 'userId' });

// Sync database
const syncDatabase = async (force = false) => {
  try {
    console.log(`Syncing database${force ? ' (force: true)' : ''}...`);
    
    // Sync all models
    await User.sync({ alter: true });
    await Family.sync({ alter: true });
    await FamilyMember.sync({ alter: true });
    await Event.sync({ alter: true });
    await EventAttendee.sync({ alter: true });
    // Sync other models as needed
    
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
};

module.exports = {
  User,
  Family,
  FamilyMember,
  Event,
  EventAttendee,
  // Export other models
  syncDatabase
};