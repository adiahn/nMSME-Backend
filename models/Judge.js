const mongoose = require('mongoose');

const judgeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  expertise_sectors: [{
    type: String,
    enum: ['fashion', 'it', 'agribusiness', 'food_beverage', 'light_manufacturing', 'creative_enterprise', 'nano_category', 'emerging_enterprise'],
    required: true
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  assigned_applications_count: {
    type: Number,
    default: 0,
    min: [0, 'Assigned applications count cannot be negative']
  },
  max_applications_per_judge: {
    type: Number,
    default: 10,
    min: [1, 'Maximum applications per judge must be at least 1']
  },
  total_scores_submitted: {
    type: Number,
    default: 0
  },
  average_score_given: {
    type: Number,
    default: 0
  },
  conflict_declarations: [{
    application_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    reason: String,
    declared_at: {
      type: Date,
      default: Date.now
    }
  }],
  judging_history: [{
    application_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    category: String,
    score_submitted: Boolean,
    scored_at: Date,
    created_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
judgeSchema.index({ user_id: 1 });
judgeSchema.index({ expertise_sectors: 1 });
judgeSchema.index({ is_active: 1 });
judgeSchema.index({ assigned_applications_count: 1 });

// Virtual for available capacity
judgeSchema.virtual('available_capacity').get(function() {
  return Math.max(0, this.max_applications_per_judge - this.assigned_applications_count);
});

// Virtual for completion rate
judgeSchema.virtual('completion_rate').get(function() {
  if (this.assigned_applications_count === 0) return 0;
  return (this.total_scores_submitted / this.assigned_applications_count) * 100;
});

// Pre-save middleware to update user role
judgeSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(this.user_id, { role: 'judge' });
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  }
  next();
});

// Static method to find judges by expertise
judgeSchema.statics.findByExpertise = function(sector) {
  return this.find({ 
    expertise_sectors: sector,
    is_active: true 
  }).populate('user_id', 'first_name last_name email');
};

// Static method to find available judges
judgeSchema.statics.findAvailable = function(sector, limit = 5) {
  return this.find({
    expertise_sectors: sector,
    is_active: true,
    assigned_applications_count: { $lt: '$max_applications_per_judge' }
  })
  .sort({ assigned_applications_count: 1 })
  .limit(limit)
  .populate('user_id', 'first_name last_name email');
};

// Method to assign application
judgeSchema.methods.assignApplication = async function(applicationId, category) {
  if (this.assigned_applications_count >= this.max_applications_per_judge) {
    throw new Error('Judge has reached maximum application capacity');
  }
  
  this.assigned_applications_count += 1;
  this.judging_history.push({
    application_id: applicationId,
    category: category,
    score_submitted: false
  });
  
  return await this.save();
};

// Method to submit score
judgeSchema.methods.submitScore = async function(applicationId) {
  const historyEntry = this.judging_history.find(
    entry => entry.application_id.toString() === applicationId.toString()
  );
  
  if (historyEntry) {
    historyEntry.score_submitted = true;
    historyEntry.scored_at = new Date();
    this.total_scores_submitted += 1;
    return await this.save();
  }
  
  throw new Error('Application not found in judge history');
};

// Method to declare conflict
judgeSchema.methods.declareConflict = async function(applicationId, reason) {
  this.conflict_declarations.push({
    application_id: applicationId,
    reason: reason
  });
  
  // Remove from assigned count if not yet scored
  const historyEntry = this.judging_history.find(
    entry => entry.application_id.toString() === applicationId.toString() && !entry.score_submitted
  );
  
  if (historyEntry) {
    this.assigned_applications_count = Math.max(0, this.assigned_applications_count - 1);
  }
  
  return await this.save();
};

module.exports = mongoose.model('Judge', judgeSchema);
