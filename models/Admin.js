const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  admin_type: {
    type: String,
    enum: ['admin', 'super_admin'],
    required: true,
    default: 'admin'
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  institution: {
    type: String,
    required: [true, 'Institution is required'],
    trim: true,
    maxlength: [200, 'Institution cannot exceed 200 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  access_level: {
    type: String,
    enum: ['basic_admin', 'senior_admin', 'super_admin'],
    required: true,
    default: 'basic_admin'
  },
  permissions: [{
    type: String,
    enum: [
      'create_judges',
      'create_admins',
      'manage_applications',
      'manage_categories',
      'manage_users',
      'view_analytics',
      'manage_system_settings',
      'assign_judges',
      'generate_reports',
      'manage_timelines',
      'full_system_access'
    ]
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  last_activity: Date,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
adminSchema.index({ user_id: 1 });
adminSchema.index({ admin_type: 1 });
adminSchema.index({ access_level: 1 });
adminSchema.index({ is_active: 1 });

// Virtual for full admin info
adminSchema.virtual('full_admin_info').get(function() {
  return `${this.title} - ${this.department}, ${this.institution}`;
});

module.exports = mongoose.model('Admin', adminSchema);
