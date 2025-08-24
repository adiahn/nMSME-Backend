const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Setting key is required'],
    unique: true,
    trim: true
  },
  value: {
    type: String,
    required: [true, 'Setting value is required']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['general', 'application', 'judging', 'email', 'file_upload', 'security', 'timeline', 'notifications'],
    default: 'general'
  },
  data_type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'json', 'date'],
    default: 'string'
  },
  is_public: {
    type: Boolean,
    default: false
  },
  is_editable: {
    type: Boolean,
    default: true
  },
  validation_rules: {
    min_value: Number,
    max_value: Number,
    allowed_values: [String],
    pattern: String
  },
  metadata: {
    default_value: String,
    last_modified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    change_history: [{
      old_value: String,
      new_value: String,
      changed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      changed_at: {
        type: Date,
        default: Date.now
      },
      reason: String
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
systemSettingSchema.index({ key: 1 });
systemSettingSchema.index({ category: 1 });
systemSettingSchema.index({ is_public: 1 });
systemSettingSchema.index({ is_editable: 1 });

// Virtual for typed value
systemSettingSchema.virtual('typed_value').get(function() {
  switch (this.data_type) {
    case 'number':
      return parseFloat(this.value);
    case 'boolean':
      return this.value === 'true' || this.value === '1';
    case 'json':
      try {
        return JSON.parse(this.value);
      } catch (error) {
        return this.value;
      }
    case 'date':
      return new Date(this.value);
    default:
      return this.value;
  }
});

// Pre-save middleware to validate value based on data type
systemSettingSchema.pre('save', function(next) {
  // Validate based on data type
  switch (this.data_type) {
    case 'number':
      if (isNaN(parseFloat(this.value))) {
        return next(new Error('Value must be a valid number'));
      }
      if (this.validation_rules.min_value !== undefined && parseFloat(this.value) < this.validation_rules.min_value) {
        return next(new Error(`Value must be at least ${this.validation_rules.min_value}`));
      }
      if (this.validation_rules.max_value !== undefined && parseFloat(this.value) > this.validation_rules.max_value) {
        return next(new Error(`Value must be at most ${this.validation_rules.max_value}`));
      }
      break;
    
    case 'boolean':
      if (!['true', 'false', '1', '0'].includes(this.value.toLowerCase())) {
        return next(new Error('Value must be a valid boolean (true/false/1/0)'));
      }
      break;
    
    case 'json':
      try {
        JSON.parse(this.value);
      } catch (error) {
        return next(new Error('Value must be valid JSON'));
      }
      break;
    
    case 'date':
      if (isNaN(new Date(this.value).getTime())) {
        return next(new Error('Value must be a valid date'));
      }
      break;
  }
  
  // Validate against allowed values if specified
  if (this.validation_rules.allowed_values && this.validation_rules.allowed_values.length > 0) {
    if (!this.validation_rules.allowed_values.includes(this.value)) {
      return next(new Error(`Value must be one of: ${this.validation_rules.allowed_values.join(', ')}`));
    }
  }
  
  // Validate against pattern if specified
  if (this.validation_rules.pattern) {
    const regex = new RegExp(this.validation_rules.pattern);
    if (!regex.test(this.value)) {
      return next(new Error(`Value does not match required pattern: ${this.validation_rules.pattern}`));
    }
  }
  
  next();
});

// Static method to get setting by key
systemSettingSchema.statics.getByKey = function(key) {
  return this.findOne({ key });
};

// Static method to get settings by category
systemSettingSchema.statics.getByCategory = function(category) {
  return this.find({ category });
};

// Static method to get public settings
systemSettingSchema.statics.getPublicSettings = function() {
  return this.find({ is_public: true });
};

// Static method to get editable settings
systemSettingSchema.statics.getEditableSettings = function() {
  return this.find({ is_editable: true });
};

// Static method to set setting value
systemSettingSchema.statics.setValue = async function(key, value, userId = null, reason = null) {
  const setting = await this.findOne({ key });
  if (!setting) {
    throw new Error(`Setting with key '${key}' not found`);
  }
  
  if (!setting.is_editable) {
    throw new Error(`Setting '${key}' is not editable`);
  }
  
  const oldValue = setting.value;
  setting.value = value;
  
  // Add to change history
  if (userId) {
    setting.metadata.change_history.push({
      old_value: oldValue,
      new_value: value,
      changed_by: userId,
      reason: reason
    });
  }
  
  return await setting.save();
};

// Static method to get multiple settings by keys
systemSettingSchema.statics.getMultiple = function(keys) {
  return this.find({ key: { $in: keys } });
};

// Static method to initialize default settings
systemSettingSchema.statics.initializeDefaults = async function() {
  const defaults = [
    {
      key: 'application_submission_enabled',
      value: 'true',
      description: 'Enable/disable application submission',
      category: 'application',
      data_type: 'boolean',
      is_public: true,
      validation_rules: { allowed_values: ['true', 'false'] }
    },
    {
      key: 'max_file_size_mb',
      value: '200',
      description: 'Maximum file size in MB for uploads',
      category: 'file_upload',
      data_type: 'number',
      is_public: true,
      validation_rules: { min_value: 1, max_value: 1000 }
    },
    {
      key: 'allowed_file_types',
      value: '["pdf","jpg","jpeg","png","mp4","avi","mov"]',
      description: 'Allowed file types for uploads',
      category: 'file_upload',
      data_type: 'json',
      is_public: true
    },
    {
      key: 'email_notifications_enabled',
      value: 'true',
      description: 'Enable/disable email notifications',
      category: 'email',
      data_type: 'boolean',
      is_public: false
    },
    {
      key: 'judge_assignment_auto',
      value: 'false',
      description: 'Enable automatic judge assignment',
      category: 'judging',
      data_type: 'boolean',
      is_public: false
    },
    {
      key: 'max_applications_per_judge',
      value: '10',
      description: 'Maximum applications per judge',
      category: 'judging',
      data_type: 'number',
      is_public: false,
      validation_rules: { min_value: 1, max_value: 50 }
    },
    {
      key: 'shortlist_percentage',
      value: '20',
      description: 'Percentage of applications to shortlist',
      category: 'judging',
      data_type: 'number',
      is_public: false,
      validation_rules: { min_value: 5, max_value: 50 }
    },
    {
      key: 'session_timeout_minutes',
      value: '60',
      description: 'Session timeout in minutes',
      category: 'security',
      data_type: 'number',
      is_public: false,
      validation_rules: { min_value: 15, max_value: 480 }
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      description: 'Enable maintenance mode',
      category: 'general',
      data_type: 'boolean',
      is_public: true
    },
    {
      key: 'system_name',
      value: 'nMSME Awards Portal',
      description: 'System display name',
      category: 'general',
      data_type: 'string',
      is_public: true
    }
  ];
  
  for (const defaultSetting of defaults) {
    const existing = await this.findOne({ key: defaultSetting.key });
    if (!existing) {
      await this.create(defaultSetting);
    }
  }
};

// Method to update value with history
systemSettingSchema.methods.updateValue = async function(newValue, userId = null, reason = null) {
  if (!this.is_editable) {
    throw new Error('This setting is not editable');
  }
  
  const oldValue = this.value;
  this.value = newValue;
  
  if (userId) {
    this.metadata.change_history.push({
      old_value: oldValue,
      new_value: newValue,
      changed_by: userId,
      reason: reason
    });
  }
  
  return await this.save();
};

// Method to get setting summary
systemSettingSchema.methods.getSummary = function() {
  return {
    key: this.key,
    value: this.value,
    typed_value: this.typed_value,
    description: this.description,
    category: this.category,
    data_type: this.data_type,
    is_public: this.is_public,
    is_editable: this.is_editable,
    updated_at: this.updatedAt
  };
};

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
