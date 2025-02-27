const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String
  },
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  }],
  recurring: {
    frequency: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'none'
    },
    endDate: Date
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'notification'],
      default: 'notification'
    },
    time: {
      type: Number, // Minutes before the event
      default: 30
    }
  }],
  category: {
    type: String,
    default: 'general'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
eventSchema.index({ familyId: 1, startDate: 1 });
eventSchema.index({ 'attendees.userId': 1 });

// Method to check if user is an attendee
eventSchema.methods.isAttendee = function(userId) {
  return this.attendees.some(attendee => 
    attendee.userId.toString() === userId.toString()
  );
};

// Method to check if user is the creator
eventSchema.methods.isCreator = function(userId) {
  return this.createdBy.toString() === userId.toString();
};

// Virtual for event duration in hours
eventSchema.virtual('durationHours').get(function() {
  return (this.endDate - this.startDate) / (1000 * 60 * 60);
});

// Virtual for checking if event is all-day
eventSchema.virtual('isAllDay').get(function() {
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  
  return startDate.getHours() === 0 && 
         startDate.getMinutes() === 0 && 
         endDate.getHours() === 23 && 
         endDate.getMinutes() === 59;
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;