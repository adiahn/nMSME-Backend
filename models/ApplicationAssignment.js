const mongoose = require('mongoose');

const applicationAssignmentSchema = new mongoose.Schema({
  application_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: [true, 'Application ID is required']
  },
  judge_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Judge',
    required: [true, 'Judge ID is required']
  },
  assigned_at: {
    type: Date,
    default: Date.now
  },
  reviewed_at: Date,
  conflict_declared: {
    type: Boolean,
    default: false
  },
  conflict_reason: String,
  status: {
    type: String,
    enum: ['assigned', 'in_review', 'completed', 'conflict_declared'],
    default: 'assigned'
  },
  review_notes: String,
  time_spent_minutes: Number,
  scoring_round: {
    type: String,
    enum: ['first_round', 'final_round'],
    default: 'first_round'
  },
  is_anonymous: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
applicationAssignmentSchema.index({ application_id: 1 });
applicationAssignmentSchema.index({ judge_id: 1 });
applicationAssignmentSchema.index({ status: 1 });
applicationAssignmentSchema.index({ assigned_at: 1 });
applicationAssignmentSchema.index({ reviewed_at: 1 });
applicationAssignmentSchema.index({ scoring_round: 1 });

// Compound index for unique assignment per judge per application
applicationAssignmentSchema.index({ application_id: 1, judge_id: 1 }, { unique: true });

// Virtual for review duration
applicationAssignmentSchema.virtual('review_duration_hours').get(function() {
  if (!this.reviewed_at || !this.assigned_at) return null;
  return Math.round((this.reviewed_at - this.assigned_at) / (1000 * 60 * 60) * 100) / 100;
});

// Virtual for days since assignment
applicationAssignmentSchema.virtual('days_since_assignment').get(function() {
  return Math.floor((new Date() - this.assigned_at) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update status
applicationAssignmentSchema.pre('save', function(next) {
  if (this.conflict_declared && this.status !== 'conflict_declared') {
    this.status = 'conflict_declared';
  } else if (this.reviewed_at && this.status === 'in_review') {
    this.status = 'completed';
  }
  next();
});

// Static method to find assignments by application
applicationAssignmentSchema.statics.findByApplication = function(applicationId) {
  return this.find({ application_id: applicationId })
    .populate('judge_id', 'user_id expertise_sectors')
    .populate('judge_id.user_id', 'first_name last_name email');
};

// Static method to find assignments by judge
applicationAssignmentSchema.statics.findByJudge = function(judgeId) {
  return this.find({ judge_id: judgeId })
    .populate('application_id', 'category business_description status')
    .populate('application_id.user_id', 'first_name last_name');
};

// Static method to find pending assignments
applicationAssignmentSchema.statics.findPending = function() {
  return this.find({ 
    status: { $in: ['assigned', 'in_review'] },
    conflict_declared: false
  }).populate('application_id judge_id');
};

// Static method to find completed assignments
applicationAssignmentSchema.statics.findCompleted = function() {
  return this.find({ status: 'completed' })
    .populate('application_id judge_id');
};

// Method to start review
applicationAssignmentSchema.methods.startReview = async function() {
  if (this.status === 'assigned') {
    this.status = 'in_review';
    return await this.save();
  }
  throw new Error('Assignment is not in assigned status');
};

// Method to complete review
applicationAssignmentSchema.methods.completeReview = async function(notes = '', timeSpent = null) {
  if (this.status === 'in_review') {
    this.status = 'completed';
    this.reviewed_at = new Date();
    this.review_notes = notes;
    if (timeSpent) this.time_spent_minutes = timeSpent;
    return await this.save();
  }
  throw new Error('Assignment is not in review status');
};

// Method to declare conflict
applicationAssignmentSchema.methods.declareConflict = async function(reason) {
  if (this.status === 'completed') {
    throw new Error('Cannot declare conflict on completed assignment');
  }
  
  this.conflict_declared = true;
  this.conflict_reason = reason;
  this.status = 'conflict_declared';
  
  return await this.save();
};

// Method to reassign to different judge
applicationAssignmentSchema.methods.reassign = async function(newJudgeId) {
  if (this.status === 'completed') {
    throw new Error('Cannot reassign completed assignment');
  }
  
  this.judge_id = newJudgeId;
  this.assigned_at = new Date();
  this.reviewed_at = null;
  this.conflict_declared = false;
  this.conflict_reason = null;
  this.status = 'assigned';
  this.review_notes = null;
  this.time_spent_minutes = null;
  
  return await this.save();
};

module.exports = mongoose.model('ApplicationAssignment', applicationAssignmentSchema);
