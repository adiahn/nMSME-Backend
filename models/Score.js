const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
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
  // 100-point scoring rubric
  innovation_differentiation: {
    type: Number,
    required: [true, 'Innovation and differentiation score is required'],
    min: [1, 'Score must be at least 1'],
    max: [20, 'Score cannot exceed 20']
  },
  market_traction_growth: {
    type: Number,
    required: [true, 'Market traction and growth score is required'],
    min: [1, 'Score must be at least 1'],
    max: [20, 'Score cannot exceed 20']
  },
  impact_job_creation: {
    type: Number,
    required: [true, 'Impact and job creation score is required'],
    min: [1, 'Score must be at least 1'],
    max: [25, 'Score cannot exceed 25']
  },
  financial_health_governance: {
    type: Number,
    required: [true, 'Financial health and governance score is required'],
    min: [1, 'Score must be at least 1'],
    max: [15, 'Score cannot exceed 15']
  },
  inclusion_sustainability: {
    type: Number,
    required: [true, 'Inclusion and sustainability score is required'],
    min: [1, 'Score must be at least 1'],
    max: [10, 'Score cannot exceed 10']
  },
  scalability_award_use: {
    type: Number,
    required: [true, 'Scalability and award use score is required'],
    min: [1, 'Score must be at least 1'],
    max: [10, 'Score cannot exceed 10']
  },
  total_score: {
    type: Number,
    required: [true, 'Total score is required'],
    min: [6, 'Total score must be at least 6'],
    max: [100, 'Total score cannot exceed 100']
  },
  comments: {
    type: String,
    maxlength: [1000, 'Comments cannot exceed 1000 characters']
  },
  scoring_round: {
    type: String,
    enum: ['first_round', 'final_round'],
    default: 'first_round'
  },
  scored_at: {
    type: Date,
    default: Date.now
  },
  is_anonymous: {
    type: Boolean,
    default: true
  },
  scoring_criteria: {
    innovation_differentiation: {
      uniqueness: Number,
      creativity: Number,
      competitive_advantage: Number
    },
    market_traction_growth: {
      market_penetration: Number,
      growth_rate: Number,
      customer_validation: Number
    },
    impact_job_creation: {
      jobs_created: Number,
      community_impact: Number,
      economic_contribution: Number
    },
    financial_health_governance: {
      financial_stability: Number,
      governance_structure: Number,
      risk_management: Number
    },
    inclusion_sustainability: {
      diversity_inclusion: Number,
      environmental_impact: Number,
      social_responsibility: Number
    },
    scalability_award_use: {
      growth_potential: Number,
      award_funds_plan: Number,
      expansion_strategy: Number
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
scoreSchema.index({ application_id: 1 });
scoreSchema.index({ judge_id: 1 });
scoreSchema.index({ total_score: 1 });
scoreSchema.index({ scored_at: 1 });
scoreSchema.index({ scoring_round: 1 });

// Compound index for unique score per judge per application per round
scoreSchema.index({ application_id: 1, judge_id: 1, scoring_round: 1 }, { unique: true });

// Virtual for score breakdown
scoreSchema.virtual('score_breakdown').get(function() {
  return {
    innovation_differentiation: this.innovation_differentiation,
    market_traction_growth: this.market_traction_growth,
    impact_job_creation: this.impact_job_creation,
    financial_health_governance: this.financial_health_governance,
    inclusion_sustainability: this.inclusion_sustainability,
    scalability_award_use: this.scalability_award_use,
    total_score: this.total_score
  };
});

// Virtual for score grade
scoreSchema.virtual('score_grade').get(function() {
  if (this.total_score >= 90) return 'A+';
  if (this.total_score >= 85) return 'A';
  if (this.total_score >= 80) return 'A-';
  if (this.total_score >= 75) return 'B+';
  if (this.total_score >= 70) return 'B';
  if (this.total_score >= 65) return 'B-';
  if (this.total_score >= 60) return 'C+';
  if (this.total_score >= 55) return 'C';
  if (this.total_score >= 50) return 'C-';
  if (this.total_score >= 45) return 'D+';
  if (this.total_score >= 40) return 'D';
  return 'F';
});

// Pre-save middleware to calculate total score
scoreSchema.pre('save', function(next) {
  const total = this.innovation_differentiation + 
                this.market_traction_growth + 
                this.impact_job_creation + 
                this.financial_health_governance + 
                this.inclusion_sustainability + 
                this.scalability_award_use;
  
  this.total_score = total;
  next();
});

// Static method to find scores by application
scoreSchema.statics.findByApplication = function(applicationId, round = 'first_round') {
  return this.find({ 
    application_id: applicationId,
    scoring_round: round 
  }).populate('judge_id', 'user_id');
};

// Static method to find scores by judge
scoreSchema.statics.findByJudge = function(judgeId, round = 'first_round') {
  return this.find({ 
    judge_id: judgeId,
    scoring_round: round 
  }).populate('application_id', 'category business_description');
};

// Static method to get average scores by application
scoreSchema.statics.getAverageScores = function(applicationId, round = 'first_round') {
  return this.aggregate([
    { $match: { application_id: mongoose.Types.ObjectId(applicationId), scoring_round: round } },
    { $group: {
      _id: null,
      avg_innovation: { $avg: '$innovation_differentiation' },
      avg_market: { $avg: '$market_traction_growth' },
      avg_impact: { $avg: '$impact_job_creation' },
      avg_financial: { $avg: '$financial_health_governance' },
      avg_inclusion: { $avg: '$inclusion_sustainability' },
      avg_scalability: { $avg: '$scalability_award_use' },
      avg_total: { $avg: '$total_score' },
      score_count: { $sum: 1 }
    }}
  ]);
};

// Static method to get top applications by score
scoreSchema.statics.getTopApplications = function(category, limit = 10, round = 'first_round') {
  return this.aggregate([
    { $match: { scoring_round: round } },
    { $lookup: {
      from: 'applications',
      localField: 'application_id',
      foreignField: '_id',
      as: 'application'
    }},
    { $unwind: '$application' },
    { $match: { 'application.category': category } },
    { $group: {
      _id: '$application_id',
      application: { $first: '$application' },
      avg_score: { $avg: '$total_score' },
      score_count: { $sum: 1 }
    }},
    { $sort: { avg_score: -1 } },
    { $limit: limit }
  ]);
};

// Method to validate score consistency
scoreSchema.methods.validateScore = function() {
  const total = this.innovation_differentiation + 
                this.market_traction_growth + 
                this.impact_job_creation + 
                this.financial_health_governance + 
                this.inclusion_sustainability + 
                this.scalability_award_use;
  
  if (total !== this.total_score) {
    throw new Error('Total score does not match sum of individual scores');
  }
  
  return true;
};

// Method to get detailed score analysis
scoreSchema.methods.getScoreAnalysis = function() {
  return {
    total_score: this.total_score,
    grade: this.score_grade,
    breakdown: this.score_breakdown,
    strengths: this.getStrengths(),
    weaknesses: this.getWeaknesses(),
    recommendations: this.getRecommendations()
  };
};

// Helper methods for score analysis
scoreSchema.methods.getStrengths = function() {
  const scores = [
    { name: 'Innovation & Differentiation', score: this.innovation_differentiation, max: 20 },
    { name: 'Market Traction & Growth', score: this.market_traction_growth, max: 20 },
    { name: 'Impact & Job Creation', score: this.impact_job_creation, max: 25 },
    { name: 'Financial Health & Governance', score: this.financial_health_governance, max: 15 },
    { name: 'Inclusion & Sustainability', score: this.inclusion_sustainability, max: 10 },
    { name: 'Scalability & Award Use', score: this.scalability_award_use, max: 10 }
  ];
  
  return scores.filter(item => (item.score / item.max) >= 0.8);
};

scoreSchema.methods.getWeaknesses = function() {
  const scores = [
    { name: 'Innovation & Differentiation', score: this.innovation_differentiation, max: 20 },
    { name: 'Market Traction & Growth', score: this.market_traction_growth, max: 20 },
    { name: 'Impact & Job Creation', score: this.impact_job_creation, max: 25 },
    { name: 'Financial Health & Governance', score: this.financial_health_governance, max: 15 },
    { name: 'Inclusion & Sustainability', score: this.inclusion_sustainability, max: 10 },
    { name: 'Scalability & Award Use', score: this.scalability_award_use, max: 10 }
  ];
  
  return scores.filter(item => (item.score / item.max) < 0.6);
};

scoreSchema.methods.getRecommendations = function() {
  const recommendations = [];
  
  if (this.innovation_differentiation < 12) {
    recommendations.push('Focus on unique value proposition and competitive differentiation');
  }
  if (this.market_traction_growth < 12) {
    recommendations.push('Develop stronger market validation and growth strategies');
  }
  if (this.impact_job_creation < 15) {
    recommendations.push('Enhance job creation impact and community contribution');
  }
  if (this.financial_health_governance < 9) {
    recommendations.push('Strengthen financial management and governance structures');
  }
  if (this.inclusion_sustainability < 6) {
    recommendations.push('Improve diversity, inclusion, and sustainability practices');
  }
  if (this.scalability_award_use < 6) {
    recommendations.push('Develop clear scalability plans and award fund utilization strategy');
  }
  
  return recommendations;
};

module.exports = mongoose.model('Score', scoreSchema);
