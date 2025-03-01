// models/index.js
const User = require('./User');
const Family = require('./Family');
const FamilyMember = require('./FamilyMember');
const Event = require('./Event');
const EventAttendee = require('./EventAttendee');
const { sequelize } = require('../config/database');

// User and Family associations
User.belongsToMany(Family, { through: FamilyMember, foreignKey: 'userId' });
Family.belongsToMany(User, { through: FamilyMember, foreignKey: 'familyId' });

Family.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

// Event associations
Event.belongsTo(Family, { foreignKey: 'familyId' });
Family.hasMany(Event, { foreignKey: 'familyId' });

Event.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
User.hasMany(Event, { foreignKey: 'createdById' });

Event.belongsToMany(User, { through: EventAttendee, foreignKey: 'eventId' });
User.belongsToMany(Event, { through: EventAttendee, foreignKey: 'userId' });

// Function to sync all models with DB
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true }); // Use { force: true } in development to recreate tables
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Family,
  FamilyMember,
  Event,
  EventAttendee,
  syncDatabase
};