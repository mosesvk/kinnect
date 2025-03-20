// src/models/Index.js - Updated with additional associations
const User = require("./User");
const Family = require("./Family");
const FamilyMember = require("./FamilyMember");
const Event = require("./Event");
const EventAttendee = require("./EventAttendee");
const EventInvitation = require('./EventInventation')
const Post = require("./Post");
const PostFamily = require("./PostFamily");
const PostEvent = require("./PostEvent");
const Comment = require("./Comment");
const Like = require("./Like");
const Media = require("./Media");

// Clear any existing associations to avoid conflicts
// This is important when models are re-loaded during development
[
  User,
  Family,
  FamilyMember,
  Event,
  EventAttendee,
  Post,
  Comment,
  Media,
].forEach((model) => {
  Object.keys(model.associations || {}).forEach((key) => {
    delete model.associations[key];
  });
});

// Define model associations clearly without overlap
// User-Family many-to-many relationship
User.belongsToMany(Family, {
  through: FamilyMember,
  foreignKey: "userId",
  otherKey: "familyId",
});

Family.belongsToMany(User, {
  through: FamilyMember,
  foreignKey: "familyId",
  otherKey: "userId",
});

// Direct FamilyMember associations
Family.hasMany(FamilyMember, {
  foreignKey: "familyId",
  as: "members",
});

FamilyMember.belongsTo(Family, {
  foreignKey: "familyId",
});

User.hasMany(FamilyMember, {
  foreignKey: "userId",
  as: "memberships",
});

FamilyMember.belongsTo(User, {
  foreignKey: "userId",
});

// Event associations
User.hasMany(Event, { foreignKey: "createdById", as: "createdEvents" });
Event.belongsTo(User, { foreignKey: "createdById", as: "creator" });

Family.hasMany(Event, { foreignKey: "familyId" });
Event.belongsTo(Family, { foreignKey: "familyId" });

Event.hasMany(EventAttendee, { foreignKey: "eventId", as: "attendees" });
EventAttendee.belongsTo(Event, { foreignKey: "eventId" });

User.hasMany(EventAttendee, { foreignKey: "userId" });
EventAttendee.belongsTo(User, { foreignKey: "userId", as: "user" });

// Event invitation associations
Event.hasMany(EventInvitation, { foreignKey: "eventId", as: "invitations" });
EventInvitation.belongsTo(Event, { foreignKey: "eventId" });

User.hasMany(EventInvitation, { foreignKey: "userId", as: "eventInvitation" });
EventInvitation.belongsTo(User, { foreignKey: "userId", as: "invitedUser" });

User.hasMany(EventInvitation, {
  foreignKey: "invitedBy",
  as: "sentInvitations",
});
EventInvitation.belongsTo(User, { foreignKey: "invitedBy", as: "inviter" });

// Post associations
User.hasMany(Post, { foreignKey: "createdById", as: "posts" });
Post.belongsTo(User, { foreignKey: "createdById", as: "author" });

// Posts can be associated with multiple families
Post.belongsToMany(Family, {
  through: PostFamily,
  foreignKey: "postId",
  otherKey: "familyId",
  as: "families",
});

Family.belongsToMany(Post, {
  through: PostFamily,
  foreignKey: "familyId",
  otherKey: "postId",
  as: "posts",
});

// Posts can be associated with multiple events
Post.belongsToMany(Event, {
  through: PostEvent,
  foreignKey: "postId",
  otherKey: "eventId",
  as: "events",
});

Event.belongsToMany(Post, {
  through: PostEvent,
  foreignKey: "eventId",
  otherKey: "postId",
  as: "posts",
});

// Comment associations
Post.hasMany(Comment, { foreignKey: "postId", as: "comments" });
Comment.belongsTo(Post, { foreignKey: "postId" });

User.hasMany(Comment, { foreignKey: "userId", as: "userComments" });
Comment.belongsTo(User, { foreignKey: "userId", as: "author" });

// Self-referential relationship for comment replies
Comment.hasMany(Comment, { foreignKey: "parentId", as: "replies" });
Comment.belongsTo(Comment, { foreignKey: "parentId", as: "parent" });

// Like associations - using polymorphic pattern
User.hasMany(Like, { foreignKey: "userId", as: "likes" });
Like.belongsTo(User, { foreignKey: "userId", as: "user" });

// Media associations
User.hasMany(Media, { foreignKey: "uploadedById", as: "uploads" });
Media.belongsTo(User, { foreignKey: "uploadedById", as: "uploader" });

// Associate media with posts (via mediaUrls array)
Media.belongsToMany(Post, {
  through: "PostMedia",
  foreignKey: "mediaId",
  otherKey: "postId",
  as: "posts",
});

Post.belongsToMany(Media, {
  through: "PostMedia",
  foreignKey: "postId",
  otherKey: "mediaId",
  as: "media",
});

// Sync database
const syncDatabase = async (force = false) => {
  try {
    console.log(`Syncing database${force ? " (force: true)" : ""}...`);

    // Sync all models
    await User.sync({ alter: true });
    await Family.sync({ alter: true });
    await FamilyMember.sync({ alter: true });
    await Event.sync({ alter: true });
    await EventAttendee.sync({ alter: true });
    await Post.sync({ alter: true });
    await PostFamily.sync({ alter: true });
    await PostEvent.sync({ alter: true });
    await Comment.sync({ alter: true });
    await Like.sync({ alter: true });
    await Media.sync({ alter: true });

    console.log("Database synchronized successfully");
  } catch (error) {
    console.error("Error syncing database:", error);
    throw error;
  }
};

module.exports = {
  User,
  Family,
  FamilyMember,
  Event,
  EventAttendee,
  Post,
  PostFamily,
  PostEvent,
  Comment,
  Like,
  Media,
  syncDatabase,
};
