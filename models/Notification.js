const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    enum: ['application_submitted', 'application_reviewed', 'shortlisted', 'results_announced', 'system_update', 'deadline_reminder', 'judge_assigned', 'score_submitted', 'conflict_declared'],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  is_read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['application', 'judging', 'system', 'deadline', 'results'],
    required: [true, 'Notification category is required']
  },
  related_entity: {
    entity_type: {
      type: String,
      enum: ['application', 'judge', 'timeline', 'score', 'user']
    },
    entity_id: mongoose.Schema.Types.ObjectId
  },
  action_url: String,
  metadata: {
    application_id: mongoose.Schema.Types.ObjectId,
    judge_id: mongoose.Schema.Types.ObjectId,
    score_id: mongoose.Schema.Types.ObjectId,
    phase: String,
    deadline: Date,
    additional_data: mongoose.Schema.Types.Mixed
  },
  scheduled_for: Date,
  sent_at: Date,
  read_at: Date,
  expires_at: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ user_id: 1 });
notificationSchema.index({ is_read: 1 });
notificationSchema.index({ created_at: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ scheduled_for: 1 });
notificationSchema.index({ expires_at: 1 });

// Compound indexes for common queries
notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ user_id: 1, category: 1 });
notificationSchema.index({ user_id: 1, created_at: -1 });

// Virtual for notification age
notificationSchema.virtual('age_hours').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for notification age in days
notificationSchema.virtual('age_days').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
notificationSchema.virtual('is_expired').get(function() {
  if (!this.expires_at) return false;
  return new Date() > this.expires_at;
});

// Virtual for is scheduled
notificationSchema.virtual('is_scheduled').get(function() {
  if (!this.scheduled_for) return false;
  return new Date() < this.scheduled_for;
});

// Pre-save middleware to set default values
notificationSchema.pre('save', function(next) {
  // Set default expiration (30 days from creation)
  if (!this.expires_at) {
    this.expires_at = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
  }
  
  // Set sent_at if not set and not scheduled
  if (!this.sent_at && !this.scheduled_for) {
    this.sent_at = new Date();
  }
  
  next();
});

// Static method to find unread notifications for user
notificationSchema.statics.findUnreadByUser = function(userId, limit = 50) {
  return this.find({
    user_id: userId,
    is_read: false,
    expires_at: { $gt: new Date() }
  })
  .sort({ created_at: -1 })
  .limit(limit);
};

// Static method to find notifications by type
notificationSchema.statics.findByType = function(type, limit = 100) {
  return this.find({ type })
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('user_id', 'first_name last_name email');
};

// Static method to find notifications by category
notificationSchema.statics.findByCategory = function(userId, category, limit = 50) {
  return this.find({
    user_id: userId,
    category: category,
    expires_at: { $gt: new Date() }
  })
  .sort({ created_at: -1 })
  .limit(limit);
};

// Static method to find scheduled notifications
notificationSchema.statics.findScheduled = function() {
  return this.find({
    scheduled_for: { $lte: new Date() },
    sent_at: { $exists: false }
  });
};

// Static method to find expired notifications
notificationSchema.statics.findExpired = function() {
  return this.find({
    expires_at: { $lt: new Date() },
    is_read: false
  });
};

// Static method to create application notification
notificationSchema.statics.createApplicationNotification = function(userId, type, applicationId, title, message, priority = 'medium') {
  return this.create({
    user_id: userId,
    type: type,
    title: title,
    message: message,
    priority: priority,
    category: 'application',
    related_entity: {
      entity_type: 'application',
      entity_id: applicationId
    },
    metadata: {
      application_id: applicationId
    }
  });
};

// Static method to create system notification
notificationSchema.statics.createSystemNotification = function(userId, title, message, priority = 'medium', actionUrl = null) {
  return this.create({
    user_id: userId,
    type: 'system_update',
    title: title,
    message: message,
    priority: priority,
    category: 'system',
    action_url: actionUrl
  });
};

// Static method to create deadline reminder
notificationSchema.statics.createDeadlineReminder = function(userId, title, message, deadline, priority = 'high') {
  return this.create({
    user_id: userId,
    type: 'deadline_reminder',
    title: title,
    message: message,
    priority: priority,
    category: 'deadline',
    metadata: {
      deadline: deadline
    }
  });
};

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.is_read) {
    this.is_read = true;
    this.read_at = new Date();
    return await this.save();
  }
  return this;
};

// Method to mark as unread
notificationSchema.methods.markAsUnread = async function() {
  this.is_read = false;
  this.read_at = null;
  return await this.save();
};

// Method to send notification
notificationSchema.methods.send = async function() {
  if (!this.sent_at) {
    this.sent_at = new Date();
    return await this.save();
  }
  return this;
};

// Method to get notification summary
notificationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    category: this.category,
    priority: this.priority,
    is_read: this.is_read,
    age_hours: this.age_hours,
    age_days: this.age_days,
    created_at: this.createdAt,
    action_url: this.action_url,
    is_expired: this.is_expired
  };
};

// Static method to get notification statistics for user
notificationSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId) } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      unread: { $sum: { $cond: ['$is_read', 0, 1] } },
      by_category: {
        $push: {
          category: '$category',
          count: 1
        }
      },
      by_priority: {
        $push: {
          priority: '$priority',
          count: 1
        }
      }
    }}
  ]);
};

module.exports = mongoose.model('Notification', notificationSchema);
