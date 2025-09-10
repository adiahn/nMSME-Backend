const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  assignment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApplicationAssignment',
    required: true
  },
  // New 6-criteria scoring system (100 points total)
  business_viability_financial_health: {
    type: Number,
    required: [true, 'Business viability & financial health score is required'],
    min: 0,
    max: 25, // 25% weight
    default: 0
  },
  market_opportunity_traction: {
    type: Number,
    required: [true, 'Market opportunity & traction score is required'],
    min: 0,
    max: 20, // 20% weight
    default: 0
  },
  social_impact_job_creation: {
    type: Number,
    required: [true, 'Social impact & job creation score is required'],
    min: 0,
    max: 20, // 20% weight
    default: 0
  },
  innovation_technology_adoption: {
    type: Number,
    required: [true, 'Innovation & technology adoption score is required'],
    min: 0,
    max: 15, // 15% weight
    default: 0
  },
  sustainability_environmental_impact: {
    type: Number,
    required: [true, 'Sustainability & environmental impact score is required'],
    min: 0,
    max: 10, // 10% weight
    default: 0
  },
  management_leadership: {
    type: Number,
    required: [true, 'Management & leadership score is required'],
    min: 0,
    max: 10, // 10% weight
    default: 0
  },
  // Calculated fields (set by pre-save middleware)
  total_score: {
    type: Number,
    min: 0,
    max: 100
  },
  weighted_score: {
    type: Number,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
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
  // Calculate total score (sum of all criteria)
  this.total_score = this.business_viability_financial_health + 
                    this.market_opportunity_traction + 
                    this.social_impact_job_creation + 
                    this.innovation_technology_adoption + 
                    this.sustainability_environmental_impact + 
                    this.management_leadership;
  
  // Calculate weighted score (convert to 100-point scale)
  this.weighted_score = this.total_score; // Already weighted by max values
  
  // Calculate grade based on total score
  if (this.total_score >= 90) {
    this.grade = 'A+';
  } else if (this.total_score >= 80) {
    this.grade = 'A';
  } else if (this.total_score >= 70) {
    this.grade = 'B+';
  } else if (this.total_score >= 60) {
    this.grade = 'B';
  } else if (this.total_score >= 50) {
    this.grade = 'C+';
  } else if (this.total_score >= 40) {
    this.grade = 'C';
  } else if (this.total_score >= 30) {
    this.grade = 'D';
  } else {
    this.grade = 'F';
  }
  
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
