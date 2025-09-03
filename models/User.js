const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^(\+234|0)[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number']
  },
  password_hash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: false
  },
  age_band: {
    type: String,
    enum: ['18-25', '26-35', '36-45', '46-55', '55+'],
    required: false
  },
  role: {
    type: String,
    enum: ['applicant', 'judge', 'admin', 'super_admin', 'sponsor', 'public'],
    default: 'applicant'
  },
  account_status: {
    type: String,
    enum: ['pending_verification', 'active', 'incomplete'],
    default: 'pending_verification'
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  },
  email_verification_token: String,
  email_verification_expires: Date,
  password_reset_token: String,
  password_reset_expires: Date,
  // OTP fields for multi-step registration
  otp_code: String,
  otp_expires: Date,
  otp_verified: {
    type: Boolean,
    default: false
  },
  registration_step: {
    type: Number,
    default: 1,
    min: 1,
    max: 3
  },
  last_login: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('full_name').get(function() {
  return `${this.first_name} ${this.last_name}`;
});

// Indexes (removed duplicate email and phone indexes since they're already unique)
userSchema.index({ role: 1 });
userSchema.index({ is_verified: 1 });
userSchema.index({ is_active: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password_hash;
  delete userObject.email_verification_token;
  delete userObject.email_verification_expires;
  delete userObject.password_reset_token;
  delete userObject.password_reset_expires;
  return userObject;
};

// Static method to find by email or phone
userSchema.statics.findByEmailOrPhone = function(emailOrPhone) {
  return this.findOne({
    $or: [
      { email: emailOrPhone.toLowerCase() },
      { phone: emailOrPhone }
    ]
  });
};

module.exports = mongoose.model('User', userSchema);
