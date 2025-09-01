const mongoose = require('mongoose');

const businessProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  business_name: {
    type: String,
    required: true,
    trim: true
  },
  cac_number: {
    type: String,
    required: true,
    unique: true,
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
    max: new Date().getFullYear()
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
      'Above ₦10,000,000/month'
    ]
  },
  // Additional fields from PRD
  business_description: {
    type: String,
    required: true,
    maxlength: 500
  },
  key_achievements: {
    type: String,
    required: true,
    maxlength: 300
  },
  products_services: {
    type: String,
    required: true
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
  // Legacy fields for backward compatibility
  business_type: String,
  registration_number: String,
  business_address: String,
  owner_position: String,
  annual_revenue: Number,
  business_description_legacy: String,
  achievements: [String],
  challenges: [String],
  future_goals: [String]
}, {
  timestamps: true
});

// Index for efficient queries
businessProfileSchema.index({ user_id: 1 });
businessProfileSchema.index({ cac_number: 1 });
businessProfileSchema.index({ sector: 1 });
businessProfileSchema.index({ msme_strata: 1 });
businessProfileSchema.index({ 'location.state': 1 });

// Virtual for full address
businessProfileSchema.virtual('full_address').get(function() {
  return `${this.location.lga}, ${this.location.state}`;
});

// Method to validate MSME strata based on employee count and revenue
businessProfileSchema.methods.validateMSMEStrata = function() {
  const { employee_count, revenue_band, msme_strata } = this;
  
  // Validation logic based on PRD criteria
  const strataValidation = {
    nano: employee_count <= 2 || revenue_band === 'Less than ₦100,000/month',
    micro: (employee_count >= 3 && employee_count <= 9),
    small: (employee_count >= 10 && employee_count <= 50),
    medium: (employee_count >= 51 && employee_count <= 199)
  };
  
  return strataValidation[msme_strata] || false;
};

// Pre-save middleware to validate MSME strata
businessProfileSchema.pre('save', function(next) {
  if (!this.validateMSMEStrata()) {
    return next(new Error('MSME strata does not match employee count or revenue criteria'));
  }
  next();
});

module.exports = mongoose.model('BusinessProfile', businessProfileSchema);
