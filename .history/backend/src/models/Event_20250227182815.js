// models/Event.js

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
    default: '',
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    default: null
  },
  location: {
    type: {
      type: String,
      enum: ['Point', ''],
      default: ''
    },
    coordinates: {
      type: [Number],
      default: []
    },
    address: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    }
  },
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'tentative'],
      default: 'pending'
    }
  }],
  recurring: {
    frequency: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'none'
    },
    interval: {
      type: Number,
      default: 1
    },
    endDate: {
      type: Date,
      default: null
    }
  },
  reminders: [{
    type: {
      type: String,
      enum: ['notification', 'email', 'sms'],
      default: 'notification'
    },
    time: {
      type: Number, // Minutes before event
      default: 15
    }
  }],
  category: {
    type: String,
    enum: ['general', 'family', 'health', 'education', 'travel', 'celebration', 'task', 'meal' 'other'],
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

// Compound index for efficient queries
eventSchema.index({ familyId: 1, startDate: 1 });
eventSchema.index({ category: 1 });

// Virtual for event duration in minutes
eventSchema.virtual('durationMinutes').get(function() {
  if (!this.endDate) return null;
  return Math.floor((this.endDate - this.startDate) / (1000 * 60));
});

// Method to check if event is recurring
eventSchema.methods.isRecurring = function() {
  return this.recurring && this.recurring.frequency !== 'none';
};

// Method to check if event is all-day
eventSchema.methods.isAllDay = function() {
  if (!this.startDate || !this.endDate) return false;
  
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  
  return start.getHours() === 0 && 
         start.getMinutes() === 0 && 
         end.getHours() === 23 && 
         end.getMinutes() === 59;
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;