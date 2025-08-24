const mongoose = require('mongoose');

const applicationTimelineSchema = new mongoose.Schema({
  phase: {
    type: String,
    enum: ['registration', 'submission', 'review', 'shortlisting', 'final_judging', 'results'],
    required: [true, 'Phase is required']
  },
  is_active: {
    type: Boolean,
    default: false
  },
  start_date: {
    type: Date,
    required: [true, 'Start date is required']
  },
  end_date: {
    type: Date,
    required: [true, 'End date is required']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  phase_order: {
    type: Number,
    required: [true, 'Phase order is required'],
    min: [1, 'Phase order must be at least 1']
  },
  requirements: [{
    requirement_type: {
      type: String,
      enum: ['document_upload', 'profile_completion', 'application_submission', 'judge_assignment', 'scoring_completion']
    },
    description: String,
    is_required: {
      type: Boolean,
      default: true
    }
  }],
  notifications: [{
    notification_type: {
      type: String,
      enum: ['reminder', 'deadline_warning', 'phase_start', 'phase_end']
    },
    days_before: Number,
    message: String,
    is_sent: {
      type: Boolean,
      default: false
    }
  }],
  settings: {
    allow_late_submissions: {
      type: Boolean,
      default: false
    },
    grace_period_days: {
      type: Number,
      default: 0,
      min: [0, 'Grace period cannot be negative']
    },
    auto_advance: {
      type: Boolean,
      default: false
    },
    max_applications_per_category: {
      type: Number,
      default: 100
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
applicationTimelineSchema.index({ phase: 1 });
applicationTimelineSchema.index({ is_active: 1 });
applicationTimelineSchema.index({ start_date: 1 });
applicationTimelineSchema.index({ end_date: 1 });
applicationTimelineSchema.index({ phase_order: 1 });

// Virtual for phase status
applicationTimelineSchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.start_date) return 'upcoming';
  if (now >= this.start_date && now <= this.end_date) return 'active';
  return 'completed';
});

// Virtual for days remaining
applicationTimelineSchema.virtual('days_remaining').get(function() {
  const now = new Date();
  if (now > this.end_date) return 0;
  return Math.ceil((this.end_date - now) / (1000 * 60 * 60 * 24));
});

// Virtual for days elapsed
applicationTimelineSchema.virtual('days_elapsed').get(function() {
  const now = new Date();
  if (now < this.start_date) return 0;
  const elapsed = Math.min(now - this.start_date, this.end_date - this.start_date);
  return Math.ceil(elapsed / (1000 * 60 * 60 * 24));
});

// Virtual for progress percentage
applicationTimelineSchema.virtual('progress_percentage').get(function() {
  const totalDuration = this.end_date - this.start_date;
  const elapsed = Math.min(new Date() - this.start_date, totalDuration);
  return Math.round((elapsed / totalDuration) * 100);
});

// Pre-save middleware to validate dates
applicationTimelineSchema.pre('save', function(next) {
  if (this.start_date >= this.end_date) {
    return next(new Error('Start date must be before end date'));
  }
  
  // Ensure only one phase is active at a time
  if (this.is_active) {
    this.constructor.updateMany(
      { _id: { $ne: this._id }, is_active: true },
      { is_active: false }
    ).exec();
  }
  
  next();
});

// Static method to get current active phase
applicationTimelineSchema.statics.getCurrentPhase = function() {
  return this.findOne({ 
    is_active: true,
    start_date: { $lte: new Date() },
    end_date: { $gte: new Date() }
  });
};

// Static method to get next phase
applicationTimelineSchema.statics.getNextPhase = function() {
  return this.findOne({
    start_date: { $gt: new Date() }
  }).sort({ start_date: 1 });
};

// Static method to get all phases in order
applicationTimelineSchema.statics.getAllPhases = function() {
  return this.find().sort({ phase_order: 1 });
};

// Static method to get phases by status
applicationTimelineSchema.statics.getPhasesByStatus = function(status) {
  const now = new Date();
  let query = {};
  
  switch (status) {
    case 'upcoming':
      query = { start_date: { $gt: now } };
      break;
    case 'active':
      query = { 
        start_date: { $lte: now },
        end_date: { $gte: now }
      };
      break;
    case 'completed':
      query = { end_date: { $lt: now } };
      break;
  }
  
  return this.find(query).sort({ phase_order: 1 });
};

// Method to activate phase
applicationTimelineSchema.methods.activate = async function() {
  // Deactivate all other phases
  await this.constructor.updateMany(
    { _id: { $ne: this._id } },
    { is_active: false }
  );
  
  this.is_active = true;
  return await this.save();
};

// Method to deactivate phase
applicationTimelineSchema.methods.deactivate = async function() {
  this.is_active = false;
  return await this.save();
};

// Method to extend phase
applicationTimelineSchema.methods.extend = async function(days) {
  this.end_date = new Date(this.end_date.getTime() + (days * 24 * 60 * 60 * 1000));
  return await this.save();
};

// Method to check if phase allows submissions
applicationTimelineSchema.methods.allowsSubmissions = function() {
  if (this.phase !== 'submission') return false;
  
  const now = new Date();
  if (now < this.start_date) return false;
  
  if (this.settings.allow_late_submissions && this.settings.grace_period_days > 0) {
    const graceDeadline = new Date(this.end_date.getTime() + (this.settings.grace_period_days * 24 * 60 * 60 * 1000));
    return now <= graceDeadline;
  }
  
  return now <= this.end_date;
};

// Method to get phase summary
applicationTimelineSchema.methods.getPhaseSummary = function() {
  return {
    phase: this.phase,
    status: this.status,
    start_date: this.start_date,
    end_date: this.end_date,
    days_remaining: this.days_remaining,
    days_elapsed: this.days_elapsed,
    progress_percentage: this.progress_percentage,
    is_active: this.is_active,
    description: this.description,
    requirements: this.requirements,
    settings: this.settings
  };
};

module.exports = mongoose.model('ApplicationTimeline', applicationTimelineSchema);
