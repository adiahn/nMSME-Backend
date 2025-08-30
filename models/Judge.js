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

// Method to get advanced performance metrics
judgeSchema.methods.getAdvancedMetrics = async function() {
  const Score = mongoose.model('Score');
  
  // Get all scores by this judge
  const scores = await Score.find({ judge_id: this._id });
  
  if (scores.length === 0) {
    return {
      total_applications_reviewed: 0,
      average_score_given: 0,
      score_distribution: {},
      sector_expertise_utilization: {},
      review_efficiency: 0,
      scoring_consistency: 0,
      strengths: [],
      areas_for_improvement: []
    };
  }
  
  // Calculate score distribution
  const scoreDistribution = {
    '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '50-59': 0, 'Below 50': 0
  };
  
  scores.forEach(score => {
    if (score.total_score >= 90) scoreDistribution['90-100']++;
    else if (score.total_score >= 80) scoreDistribution['80-89']++;
    else if (score.total_score >= 70) scoreDistribution['70-79']++;
    else if (score.total_score >= 60) scoreDistribution['60-69']++;
    else if (score.total_score >= 50) scoreDistribution['50-59']++;
    else scoreDistribution['Below 50']++;
  });
  
  // Calculate sector expertise utilization
  const sectorUtilization = {};
  this.expertise_sectors.forEach(sector => {
    const sectorScores = scores.filter(score => 
      score.application_id && score.application_id.sector === sector
    );
    sectorUtilization[sector] = sectorScores.length;
  });
  
  // Calculate scoring consistency (standard deviation)
  const totalScores = scores.map(s => s.total_score);
  const mean = totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;
  const variance = totalScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / totalScores.length;
  const standardDeviation = Math.sqrt(variance);
  const scoringConsistency = Math.max(0, 100 - (standardDeviation * 2)); // Higher is better
  
  // Calculate review efficiency (average time per review)
  const ApplicationAssignment = mongoose.model('ApplicationAssignment');
  const assignments = await ApplicationAssignment.find({ 
    judge_id: this._id, 
    status: 'completed',
    time_spent_minutes: { $exists: true, $ne: null }
  });
  
  const totalTime = assignments.reduce((sum, assignment) => sum + (assignment.time_spent_minutes || 0), 0);
  const averageTimePerReview = assignments.length > 0 ? totalTime / assignments.length : 0;
  
  // Identify strengths and areas for improvement
  const criteriaScores = {
    innovation: scores.map(s => s.innovation_differentiation).filter(Boolean),
    market: scores.map(s => s.market_traction_growth).filter(Boolean),
    impact: scores.map(s => s.impact_job_creation).filter(Boolean),
    financial: scores.map(s => s.financial_health_governance).filter(Boolean),
    inclusion: scores.map(s => s.inclusion_sustainability).filter(Boolean),
    scalability: scores.map(s => s.scalability_award_use).filter(Boolean)
  };
  
  const strengths = [];
  const areasForImprovement = [];
  
  Object.entries(criteriaScores).forEach(([criteria, scores]) => {
    if (scores.length > 0) {
      const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (avg >= 0.8) {
        strengths.push(`${criteria.charAt(0).toUpperCase() + criteria.slice(1)} (${avg.toFixed(1)}/100)`);
      } else if (avg < 0.6) {
        areasForImprovement.push(`${criteria.charAt(0).toUpperCase() + criteria.slice(1)} (${avg.toFixed(1)}/100)`);
      }
    }
  });
  
  return {
    total_applications_reviewed: scores.length,
    average_score_given: mean,
    score_distribution: scoreDistribution,
    sector_expertise_utilization: sectorUtilization,
    review_efficiency: Math.max(0, 100 - (averageTimePerReview / 2)), // Higher is better
    scoring_consistency: Math.round(scoringConsistency),
    strengths: strengths,
    areas_for_improvement: areasForImprovement,
    average_time_per_review: Math.round(averageTimePerReview),
    total_time_spent: totalTime
  };
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
