const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendOTPEmail, sendEmailVerification, sendPasswordReset, sendWelcomeEmail, generateEmailVerificationToken, generatePasswordResetToken } = require('../utils/emailService');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Generate OTP for registration
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Cleanup incomplete registrations (older than 15 minutes)
const cleanupIncompleteRegistrations = async () => {
  try {
    const cutoffTime = Date.now() - 15 * 60 * 1000; // 15 minutes ago
    const result = await User.deleteMany({
      registration_step: { $lt: 3 },
      created_at: { $lt: new Date(cutoffTime) }
    });
    
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} incomplete registrations`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

router.post('/register', [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^(\+234|0)[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('age_band')
    .optional()
    .isIn(['18-25', '26-35', '36-45', '46-55', '55+'])
    .withMessage('Invalid age band')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { first_name, last_name, email, phone, password, gender, age_band } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmailOrPhone(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email or phone number'
      });
    }

    // Create user
    const user = await User.create({
      first_name,
      last_name,
      email,
      phone,
      password_hash: password, // Will be hashed by pre-save middleware
      gender,
      age_band
    });

    // Generate email verification token
    const verificationToken = generateEmailVerificationToken(user._id);
    user.email_verification_token = verificationToken;
    user.email_verification_expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Send verification email
    await sendEmailVerification(user, verificationToken);

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email_or_phone')
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email_or_phone, password } = req.body;

    // Find user by email or phone
    const user = await User.findByEmailOrPhone(email_or_phone);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
});

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
router.post('/verify-email', [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { token } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }

    // Check if token is expired
    if (user.email_verification_expires < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired'
      });
    }

    // Check if token matches
    if (user.email_verification_token !== token) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }

    // Verify user
    user.is_verified = true;
    user.email_verification_token = undefined;
    user.email_verification_expires = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user);

    // Generate JWT token
    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully',
      token: jwtToken,
      user: user.getPublicProfile()
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired'
      });
    }
    
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during email verification'
    });
  }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken(user._id);
    user.password_reset_token = resetToken;
    user.password_reset_expires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send password reset email
    await sendPasswordReset(user, resetToken);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during password reset request'
    });
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { token, new_password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }

    // Check if token is expired
    if (user.password_reset_expires < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'Reset token has expired'
      });
    }

    // Check if token matches
    if (user.password_reset_token !== token) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }

    // Update password
    user.password_hash = new_password; // Will be hashed by pre-save middleware
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: 'Reset token has expired'
      });
    }
    
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during password reset'
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', (req, res) => {
  // Since we're using JWT, we don't need to do anything server-side
  // The client should remove the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Multi-step registration endpoints

// Step 1: Send OTP
router.post('/register/step1', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^(\+234|0)[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, phone, first_name, last_name } = req.body;

    // Cleanup old incomplete registrations first
    await cleanupIncompleteRegistrations();

    // Check if user already exists (including incomplete registrations)
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });
    
    if (existingUser) {
      // If it's an incomplete registration, allow retry
      if (existingUser.registration_step < 3) {
        // Delete the incomplete registration
        await User.findByIdAndDelete(existingUser._id);
        console.log(`🔄 Allowing retry for incomplete registration: ${email}`);
      } else {
        return res.status(400).json({
          success: false,
          error: 'User already exists with this email or phone number'
        });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // First, try to send OTP email BEFORE creating user record
    const testUser = { email, first_name, last_name }; // Temporary object for email
    const otpSent = await sendOTPEmail(testUser, otp);
    
    if (!otpSent) {
      // For development/testing: return OTP in response if email fails
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ SendGrid email failed. Returning OTP in response for testing.');
        
        // Create temporary user record only for development
        const user = await User.create({
          email,
          phone,
          first_name,
          last_name,
          password_hash: 'temporary', // Will be updated in step 3
          registration_step: 1,
          otp_code: otp,
          otp_expires: otpExpires
        });
        
        res.json({
          success: true,
          message: 'OTP sent successfully (development mode)',
          data: {
            user_id: user._id,
            otp: otp, // Only in development
            expires_in: 10 * 60 // 10 minutes
          }
        });
        return;
      }
      
      // If email fails in production, don't create user record
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP. Please try again.'
      });
    }

    // Only create user record if OTP email was sent successfully
    const user = await User.create({
      email,
      phone,
      first_name,
      last_name,
      password_hash: 'temporary', // Will be updated in step 3
      registration_step: 1,
      otp_code: otp,
      otp_expires: otpExpires
    });
    
    res.json({
      success: true,
      message: 'OTP sent successfully to your email',
      data: {
        user_id: user._id,
        expires_in: 10 * 60 // 10 minutes
      }
    });
  } catch (error) {
    console.error('Step 1 registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration step 1'
    });
  }
});

// Step 2: Verify OTP
router.post('/register/step2', [
  body('user_id')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { user_id, otp } = req.body;

    // Find user
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Check if OTP is expired
    if (user.otp_expires < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'OTP has expired'
      });
    }

    // Check if OTP matches
    if (user.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }

    // Mark OTP as verified and move to step 3
    user.otp_verified = true;
    user.registration_step = 3;
    await user.save();

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        user_id: user._id
      }
    });
  } catch (error) {
    console.error('Step 2 registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration step 2'
    });
  }
});

// Step 3: Complete registration with password
router.post('/register/step3', [
  body('user_id')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['applicant', 'judge', 'admin', 'sponsor', 'public'])
    .withMessage('Invalid role')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { user_id, password, role = 'applicant' } = req.body;

    // Find user
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Check if OTP was verified
    if (!user.otp_verified) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be verified first'
      });
    }

    // Update user with password and complete registration
    user.password_hash = password; // Will be hashed by pre-save middleware
    user.role = role;
    user.registration_step = 3;
    user.is_verified = true; // Auto-verify since OTP was verified
    user.otp_code = undefined;
    user.otp_expires = undefined;
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Step 3 registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration step 3'
    });
  }
});

// @desc    Cleanup incomplete registrations (for testing)
// @route   POST /api/auth/cleanup
// @access  Public
router.post('/cleanup', async (req, res) => {
  try {
    await cleanupIncompleteRegistrations();
    res.json({
      success: true,
      message: 'Cleanup completed'
    });
  } catch (error) {
    console.error('Cleanup endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
});

module.exports = router;
