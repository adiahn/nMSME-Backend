const mongoose = require('mongoose');

// Document schema for application attachments
const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  original_name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  cloudinary_id: {
    type: String,
    required: true
  },
  document_type: {
    type: String,
    required: true,
    enum: [
      'cac_certificate',      // Mandatory from PRD
      'tax_identification',   // Optional from PRD
      'product_photos',       // Max 5 photos from PRD
      'business_plan',        // Optional
      'financial_statements', // Optional
      'other'                 // Other supporting documents
    ]
  },
  size: {
    type: Number,
    required: true
  },
  mime_type: {
    type: String,
    required: true
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
});

// Score schema for judging
const scoreSchema = new mongoose.Schema({
  judge_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Judge',
    required: true
  },
  // Scoring rubric from PRD - 6 criteria with exact weights
  innovation_differentiation: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 20
    },
    comments: String
  },
  market_traction_growth: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 20
    },
    comments: String
  },
  impact_job_creation: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 25
    },
    comments: String
  },
  financial_health_governance: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 15
    },
    comments: String
  },
  inclusion_sustainability: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    comments: String
  },
  scalability_award_use: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    comments: String
  },
  total_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const applicationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Business details - all included in application form
  business_name: {
    type: String,
    required: true,
    trim: true
  },
  business_registration_status: {
    type: String,
    required: true,
    enum: ['registered', 'not_registered'],
    default: 'registered'
  },
  cac_number: {
    type: String,
    required: function() {
      return this.business_registration_status === 'registered';
    },
    trim: true
  },
  sector: {
    type: String,
    required: true,
    enum: [
      'Fashion',
      'Information Technology (IT)',
      'Agribusiness',
      'Food & Beverage',
      'Light Manufacturing',
      'Creative Enterprise',
      'Emerging Enterprise Award'
    ]
  },
  msme_strata: {
    type: String,
    required: true,
    enum: ['nano', 'micro', 'small', 'medium']
  },
  location: {
    state: {
      type: String,
      required: true
    },
    lga: {
      type: String,
      required: true
    }
  },
  year_established: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  employee_count: {
    type: Number,
    required: true,
    min: 1
  },
  revenue_band: {
    type: String,
    required: true,
    enum: [
      'Less than ₦100,000/month',
      '₦100,000 - ₦500,000/month',
      '₦500,000 - ₦1,000,000/month',
      '₦1,000,000 - ₦5,000,000/month',
      '₦5,000,000 - ₦10,000,000/month',
      'Above ₦10,000,000/month',
      // Allow Korean Won versions for now
      'Less than ₩100,000/month',
      '₩100,000 - ₩500,000/month',
      '₩500,000 - ₩1,000,000/month',
      '₩1,000,000 - ₩5,000,000/month',
      '₩5,000,000 - ₩10,000,000/month',
      'Above ₩10,000,000/month'
    ]
  },
  business_description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  website: {
    type: String,
    trim: true
  },
  social_media: {
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String
  },
  // Application category from PRD
  category: {
    type: String,
    required: true,
    enum: [
      'Fashion',
      'Information Technology (IT)',
      'Agribusiness',
      'Food & Beverage',
      'Light Manufacturing',
      'Creative Enterprise',
      'Emerging Enterprise Award'
    ]
  },
  // Application workflow stage from PRD
  workflow_stage: {
    type: String,
    required: true,
    enum: [
      'submitted',       // Stage 1: Application Form completed and submitted
      'pre_screening',   // Stage 2: Pre-Screening & Verification
      'under_review',    // Stage 3: Judging
      'shortlisted',     // Stage 4: Shortlisting
      'finalist',        // Stage 5: Winner Selection
      'winner',          // Final winner
      'rejected'         // Rejected at any stage
    ],
    default: 'submitted'
  },
  // Application form fields from PRD
  key_achievements: {
    type: String,
    required: true,
    maxlength: 1000
  },
  products_services_description: {
    type: String,
    required: true
  },

  // Impact metrics from PRD
  jobs_created: {
    type: Number,
    required: true,
    min: 0
  },
  women_youth_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  export_activity: {
    has_exports: {
      type: Boolean,
      required: true
    },
    export_details: String
  },
  sustainability_initiatives: {
    has_initiatives: {
      type: Boolean,
      required: true
    },
    initiative_details: String
  },
  award_usage_plans: {
    type: String,
    required: true
  },
  // Documents from PRD
  documents: [documentSchema],
  // Mandatory video pitch from PRD
  pitch_video: {
    url: {
      type: String,
      required: true
    },
    is_youtube_link: {
      type: Boolean,
      default: false
    },
    youtube_vimeo_url: String,
    video_id: String, // Extract video ID from URL
    platform: {
      type: String,
      enum: ['youtube', 'vimeo'],
      required: false // Make optional during creation
    }
  },
  // Scoring and judging
  scores: [scoreSchema],
  total_score: {
    type: Number,
    default: 0
  },
  average_score: {
    type: Number,
    default: 0
  },
  // Pre-screening results
  pre_screening: {
    passed: {
      type: Boolean,
      default: false
    },
    checked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checked_at: Date,
    notes: String,
    issues: [String]
  },
  // Application timeline
  submission_date: {
    type: Date
  },
  review_start_date: {
    type: Date
  },
  review_completion_date: {
    type: Date
  },
  shortlist_date: {
    type: Date
  },
  winner_announcement_date: {
    type: Date
  },
  // Legacy fields for backward compatibility
  business_type: String,
  owner_position: String,
  alternate_phone: String,
  why_deserve_award: String,
  achievements: [String],
  challenges: [String],
  future_goals: [String],
  target_market: String,
  status: String
}, {
  timestamps: true
});

// Indexes for efficient queries
applicationSchema.index({ user_id: 1 });
applicationSchema.index({ category: 1 });
// Unique index to ensure one application per user total
applicationSchema.index({ user_id: 1 }, { unique: true });
applicationSchema.index({ sector: 1 });
applicationSchema.index({ msme_strata: 1 });
applicationSchema.index({ workflow_stage: 1 });
applicationSchema.index({ submission_date: 1 });
applicationSchema.index({ total_score: -1 });
applicationSchema.index({ cac_number: 1 });
applicationSchema.index({ 'location.state': 1 });

// Virtual for application age
applicationSchema.virtual('application_age').get(function() {
  if (!this.submission_date) return 0;
  return Math.floor((Date.now() - this.submission_date.getTime()) / (1000 * 60 * 60 * 24));
});

// Method to calculate total score from individual criteria
applicationSchema.methods.calculateTotalScore = function() {
  if (!this.scores || this.scores.length === 0) return 0;
  
  const totalScores = this.scores.map(score => score.total_score);
  const average = totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;
  
  this.total_score = Math.round(average);
  this.average_score = average;
  
  return this.total_score;
};

// Method to validate required documents from PRD
applicationSchema.methods.validateRequiredDocuments = function() {
  const requiredDocs = {
    cac_certificate: false,
    pitch_video: false,
    product_photos: false
  };
  
  // Check for CAC certificate (only required if business is registered)
  if (this.business_registration_status === 'registered') {
    const cacDoc = this.documents.find(doc => doc.document_type === 'cac_certificate');
    if (cacDoc) requiredDocs.cac_certificate = true;
  } else {
    // For unregistered businesses, CAC certificate is not required
    requiredDocs.cac_certificate = true;
  }
  
  // Check for pitch video link
  if (this.pitch_video && this.pitch_video.url && this.pitch_video.platform) {
    requiredDocs.pitch_video = true;
  }
  
  // Check for product photos (at least 1, max 5)
  const photoDocs = this.documents.filter(doc => doc.document_type === 'product_photos');
  if (photoDocs.length >= 1 && photoDocs.length <= 5) {
    requiredDocs.product_photos = true;
  }
  
  return requiredDocs;
};

// Method to check if application is complete (for validation purposes)
applicationSchema.methods.isComplete = function() {
  const requiredDocs = this.validateRequiredDocuments();
  const hasAllRequiredDocs = Object.values(requiredDocs).every(Boolean);
  
  // Check required fields based on business registration status
  const hasRequiredFields = 
    this.business_description &&
    this.key_achievements &&
    this.products_services_description &&
    this.jobs_created !== undefined &&
    this.women_youth_percentage !== undefined &&
    this.export_activity.has_exports !== undefined &&
    this.sustainability_initiatives.has_initiatives !== undefined &&
    this.award_usage_plans &&
    // CAC number is only required for registered businesses
    (this.business_registration_status === 'not_registered' || this.cac_number);
  
  return hasAllRequiredDocs && hasRequiredFields;
};

// Pre-save middleware to calculate scores
applicationSchema.pre('save', function(next) {
  if (this.scores && this.scores.length > 0) {
    this.calculateTotalScore();
  }
  next();
});

  // Method to get anonymized application data for judges (first round)
  applicationSchema.methods.getAnonymizedData = function() {
    return {
      _id: this._id,
      category: this.sector,
      business_description: this.business_description,
      key_achievements: this.key_achievements,
      products_services_description: this.products_services_description,
      jobs_created: this.jobs_created,
    women_youth_percentage: this.women_youth_percentage,
    export_activity: this.export_activity,
    sustainability_initiatives: this.sustainability_initiatives,
    award_usage_plans: this.award_usage_plans,
    pitch_video: this.pitch_video,
    documents: this.documents,
    msme_strata: this.msme_strata,
    year_established: this.year_established,
    employee_count: this.employee_count,
    revenue_band: this.revenue_band,
    // Anonymized identifiers
    application_code: this.generateApplicationCode(),
    sector: this.sector,
    location: {
      state: this.location.state,
      lga: this.location.lga
    }
  };
};

  // Method to get partially anonymized data (final round - judges can see business names)
  applicationSchema.methods.getPartiallyAnonymizedData = function() {
    return {
      _id: this._id,
      business_name: this.business_name,
      category: this.sector,
      business_description: this.business_description,
      key_achievements: this.key_achievements,
      products_services_description: this.products_services_description,
      jobs_created: this.jobs_created,
    women_youth_percentage: this.women_youth_percentage,
    export_activity: this.export_activity,
    sustainability_initiatives: this.sustainability_initiatives,
    award_usage_plans: this.award_usage_plans,
    pitch_video: this.pitch_video,
    documents: this.documents,
    msme_strata: this.msme_strata,
    year_established: this.year_established,
    employee_count: this.employee_count,
    revenue_band: this.revenue_band,
    sector: this.sector,
    location: {
      state: this.location.state,
      lga: this.location.lga
    }
  };
};

// Generate unique application code for anonymization
applicationSchema.methods.generateApplicationCode = function() {
  const timestamp = this._id.toString().slice(-6);
  const sectorCode = this.sector.substring(0, 2).toUpperCase();
  const msmeCode = this.msme_strata.substring(0, 1).toUpperCase();
  return `${sectorCode}${msmeCode}${timestamp}`;
};

module.exports = mongoose.model('Application', applicationSchema);
