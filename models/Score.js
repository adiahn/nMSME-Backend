const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  assignment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApplicationAssignment',
    required: true
  },
  // Updated to match frontend ScoringRubric interface
  innovation_differentiation: {
    type: Number,
    required: [true, 'Innovation differentiation score is required'],
    min: 0,
    max: 100,
    default: 0
  },
  market_traction_growth: {
    type: Number,
    required: [true, 'Market traction & growth score is required'],
    min: 0,
    max: 100,
    default: 0
  },
  impact_job_creation: {
    type: Number,
    required: [true, 'Impact & job creation score is required'],
    min: 0,
    max: 100,
    default: 0
  },
  financial_health_governance: {
    type: Number,
    required: [true, 'Financial health & governance score is required'],
    min: 0,
    max: 100,
    default: 0
  },
  inclusion_sustainability: {
    type: Number,
    required: [true, 'Inclusion & sustainability score is required'],
    min: 0,
    max: 100,
    default: 0
  },
  scalability_award_use: {
    type: Number,
    required: [true, 'Scalability & award use score is required'],
    min: 0,
    max: 100,
    default: 0
  },
  // Calculated fields
  total_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  weighted_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    required: true,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  // Additional fields
  comments: {
    type: String,
    required: [true, 'Comments are required for scores below 70']
  },
  review_notes: String,
  time_spent_minutes: Number,
  scored_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate total and weighted scores
scoreSchema.pre('save', function(next) {
  // Calculate total score (simple average)
  this.total_score = (
    this.innovation_differentiation +
    this.market_traction_growth +
    this.impact_job_creation +
    this.financial_health_governance +
    this.inclusion_sustainability +
    this.scalability_award_use
  ) / 6;

  // Calculate weighted score based on frontend percentages
  this.weighted_score = (
    (this.innovation_differentiation * 0.20) +      // 20%
    (this.market_traction_growth * 0.20) +         // 20%
    (this.impact_job_creation * 0.25) +            // 25%
    (this.financial_health_governance * 0.15) +    // 15%
    (this.inclusion_sustainability * 0.10) +        // 10%
    (this.scalability_award_use * 0.10)            // 10%
  );

  // Determine grade based on weighted score
  if (this.weighted_score >= 90) this.grade = 'A+';
  else if (this.weighted_score >= 80) this.grade = 'A';
  else if (this.weighted_score >= 70) this.grade = 'B+';
  else if (this.weighted_score >= 60) this.grade = 'B';
  else if (this.weighted_score >= 50) this.grade = 'C+';
  else if (this.weighted_score >= 40) this.grade = 'C';
  else if (this.weighted_score >= 30) this.grade = 'D';
  else this.grade = 'F';

  next();
});

// Validation for comments on low scores
scoreSchema.pre('save', function(next) {
  if (this.total_score < 70 && !this.comments) {
    const error = new Error('Comments are required for total scores below 70');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Score', scoreSchema);
