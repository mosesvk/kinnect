// const mongoose = require('mongoose');

// const familySchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   members: [{
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true
//     },
//     role: {
//       type: String,
//       enum: ['admin', 'member', 'guardian', 'child'],
//       default: 'member'
//     },
//     joinedAt: {
//       type: Date,
//       default: Date.now
//     },
//     permissions: [{
//       type: String,
//       enum: ['read', 'write', 'admin']
//     }]
//   }],
//   settings: {
//     privacyLevel: {
//       type: String,
//       enum: ['private', 'members', 'public'],
//       default: 'private'
//     },
//     notificationPreferences: {
//       events: Boolean,
//       tasks: Boolean,
//       documents: Boolean,
//       default: true
//     }
//   }
// }, {
//   timestamps: true
// });

// // Index for efficient queries
// familySchema.index({ name: 1 });
// familySchema.index({ 'members.userId': 1 });

// const Family = mongoose.model('Family', familySchema);

// module.exports = Family;
