// src/models/Index.js
const User = require('./User');
const { Family, FamilyMember } = require('./Family');
const Event = require('./Event');
const EventAttendee = require('./EventAttendee');

// Clear any existing associations to avoid conflicts
// This is important when models are re-loaded during development
Object.keys(User.associations || {}).forEach(key => {
  delete User.associations[key];
});

Object.keys(Family.associations || {}).forEach(key => {
  delete Family.associations[key];
});

Object.keys(FamilyMember.associations || {}).forEach(key => {
  delete FamilyMember.associations[key];
});

// Define model associations clearly without overlap
// User-Family many-to-many relationship
User.belongsToMany(Family, { 
  through: FamilyMember, 
  foreignKey: 'userId',
  otherKey: 'familyId'
});

Family.belongsToMany(User, { 
  through: FamilyMember, 
  foreignKey: 'familyId',
  otherKey: 'userId'
});

// Direct FamilyMember associations
Family.hasMany(FamilyMember, { 
  foreignKey: 'familyId',
  as: 'members' 
});

FamilyMember.belongsTo(Family, { 
  foreignKey: 'familyId' 
});

User.hasMany(FamilyMember, { 
  foreignKey: 'userId',
  as: 'memberships' 
});

FamilyMember.belongsTo(User, { 
  foreignKey: 'userId' 
});

// Keep other associations
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
  syncDatabase
};d