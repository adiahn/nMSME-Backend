const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { User, BusinessProfile, Notification } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { sendApplicationStatusNotification } = require('../utils/emailService');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @route   GET /api/user/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash -email_verification_token -password_reset_token');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/user/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/profile', [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^(\+234|0)[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('age_band')
    .optional()
    .isIn(['18-25', '26-35', '36-45', '46-55', '56+'])
    .withMessage('Age band must be one of the specified ranges')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { first_name, last_name, phone, gender, age_band } = req.body;
    
    // Check if phone number is already taken by another user
    if (phone) {
      const existingUser = await User.findOne({ 
        phone, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone number is already registered by another user'
        });
      }
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        first_name: first_name || req.user.first_name,
        last_name: last_name || req.user.last_name,
        phone: phone || req.user.phone,
        gender: gender || req.user.gender,
        age_band: age_band || req.user.age_band
      },
      { new: true, runValidators: true }
    ).select('-password_hash -email_verification_token -password_reset_token');

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/user/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { current_password, new_password } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(current_password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    user.password_hash = newPasswordHash;
    await user.save();

    // Send notification
    await Notification.createSystemNotification(
      user._id,
      'Password Changed',
      'Your password has been successfully changed. If you did not make this change, please contact support immediately.',
      'high'
    );

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/user/business-profile
 * @desc    Get user's business profile
 * @access  Private
 */
router.get('/business-profile', async (req, res) => {
  try {
    const businessProfile = await BusinessProfile.findOne({ user_id: req.user.id });
    
    if (!businessProfile) {
      return res.status(404).json({
        status: 'error',
        message: 'Business profile not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        business_profile: businessProfile
      }
    });
  } catch (error) {
    console.error('Error fetching business profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/user/business-profile
 * @desc    Create user's business profile
 * @access  Private
 */
router.post('/business-profile', [
  body('business_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('cac_number')
    .trim()
    .matches(/^RC\d{6,}$/)
    .withMessage('Please provide a valid CAC number (e.g., RC123456)'),
  body('sector')
    .isIn(['fashion', 'it', 'agribusiness', 'food_beverage', 'light_manufacturing', 'creative_enterprise', 'nano_category', 'emerging_enterprise'])
    .withMessage('Please select a valid sector'),
  body('msme_category')
    .isIn(['micro', 'small', 'medium'])
    .withMessage('Please select a valid MSME category'),
  body('state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  body('lga')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('LGA must be between 2 and 50 characters'),
  body('start_year')
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Please provide a valid start year'),
  body('employee_count')
    .isInt({ min: 1, max: 300 })
    .withMessage('Employee count must be between 1 and 300'),
  body('revenue_band')
    .isIn(['under_1m', '1m_5m', '5m_10m', '10m_50m', '50m_100m', 'over_100m'])
    .withMessage('Please select a valid revenue band'),
  body('business_description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Business description cannot exceed 1000 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if business profile already exists
    const existingProfile = await BusinessProfile.findOne({ user_id: req.user.id });
    if (existingProfile) {
      return res.status(400).json({
        status: 'error',
        message: 'Business profile already exists for this user'
      });
    }

    // Check if CAC number is already registered
    const existingCAC = await BusinessProfile.findOne({ cac_number: req.body.cac_number });
    if (existingCAC) {
      return res.status(400).json({
        status: 'error',
        message: 'CAC number is already registered by another business'
      });
    }

    // Create business profile
    const businessProfile = new BusinessProfile({
      user_id: req.user.id,
      ...req.body
    });

    await businessProfile.save();

    // Send notification
    await Notification.createSystemNotification(
      req.user.id,
      'Business Profile Created',
      'Your business profile has been successfully created. You can now proceed with your award application.',
      'medium'
    );

    res.status(201).json({
      status: 'success',
      message: 'Business profile created successfully',
      data: {
        business_profile: businessProfile
      }
    });
  } catch (error) {
    console.error('Error creating business profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/user/business-profile
 * @desc    Update user's business profile
 * @access  Private
 */
router.put('/business-profile', [
  body('business_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('sector')
    .optional()
    .isIn(['fashion', 'it', 'agribusiness', 'food_beverage', 'light_manufacturing', 'creative_enterprise', 'nano_category', 'emerging_enterprise'])
    .withMessage('Please select a valid sector'),
  body('msme_category')
    .optional()
    .isIn(['micro', 'small', 'medium'])
    .withMessage('Please select a valid MSME category'),
  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  body('lga')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('LGA must be between 2 and 50 characters'),
  body('start_year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Please provide a valid start year'),
  body('employee_count')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Employee count must be between 1 and 300'),
  body('revenue_band')
    .optional()
    .isIn(['under_1m', '1m_5m', '5m_10m', '10m_50m', '50m_100m', 'over_100m'])
    .withMessage('Please select a valid revenue band'),
  body('business_description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Business description cannot exceed 1000 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Find and update business profile
    const businessProfile = await BusinessProfile.findOneAndUpdate(
      { user_id: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!businessProfile) {
      return res.status(404).json({
        status: 'error',
        message: 'Business profile not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Business profile updated successfully',
      data: {
        business_profile: businessProfile
      }
    });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/user/business-profile
 * @desc    Delete user's business profile
 * @access  Private
 */
router.delete('/business-profile', async (req, res) => {
  try {
    const businessProfile = await BusinessProfile.findOneAndDelete({ user_id: req.user.id });

    if (!businessProfile) {
      return res.status(404).json({
        status: 'error',
        message: 'Business profile not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Business profile deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting business profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/user/application-stats
 * @desc    Get user's application statistics
 * @access  Private
 */
router.get('/application-stats', async (req, res) => {
  try {
    const { Application } = require('../models');
    
    // Get application counts by status
    const totalApplications = await Application.countDocuments({ user_id: req.user.id });
    const submittedApplications = await Application.countDocuments({ 
      user_id: req.user.id, 
      status: 'submitted' 
    });
    const underReviewApplications = await Application.countDocuments({ 
      user_id: req.user.id, 
      status: 'under_review' 
    });
    const approvedApplications = await Application.countDocuments({ 
      user_id: req.user.id, 
      status: 'approved' 
    });
    const rejectedApplications = await Application.countDocuments({ 
      user_id: req.user.id, 
      status: 'rejected' 
    });

    // Get average score if any applications have been scored
    const scoredApplications = await Application.find({
      user_id: req.user.id,
      status: { $in: ['under_review', 'approved', 'rejected'] }
    }).populate('scores');

    let averageScore = null;
    if (scoredApplications.length > 0) {
      const totalScore = scoredApplications.reduce((sum, app) => {
        if (app.scores && app.scores.length > 0) {
          const appAverage = app.scores.reduce((s, score) => s + score.total_score, 0) / app.scores.length;
          return sum + appAverage;
        }
        return sum;
      }, 0);
      averageScore = totalScore / scoredApplications.length;
    }

    res.json({
      status: 'success',
      data: {
        total_applications: totalApplications,
        submitted: submittedApplications,
        under_review: underReviewApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        average_score: averageScore ? Math.round(averageScore * 100) / 100 : null
      }
    });
  } catch (error) {
    console.error('Error fetching application statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/user/application-status
 * @desc    Check if user has an application and get its status
 * @access  Private
 */
router.get('/application-status', async (req, res) => {
  try {
    console.log('Checking application status for user:', req.user.id);
    
    // Import Application model
    const { Application } = require('../models');
    
    // Check if user has any application
    const application = await Application.findOne({ user_id: req.user.id })
      .select('_id business_name category workflow_stage createdAt updatedAt documents pitch_video')
      .lean();

    if (!application) {
      // User has no application
      return res.json({
        success: true,
        has_application: false,
        message: 'No application found for this user',
        data: {
          can_submit: true,
          application_count: 0
        }
      });
    }

    // User has an application
    const applicationStatus = {
      success: true,
      has_application: true,
      message: 'Application found',
      data: {
        application_id: application._id,
        business_name: application.business_name,
        category: application.category,
        workflow_stage: application.workflow_stage,
        created_at: application.createdAt,
        updated_at: application.updatedAt,
        documents_count: application.documents ? application.documents.length : 0,
        has_pitch_video: !!application.pitch_video,
        can_submit: false, // User already has an application
        application_count: 1,
        status_summary: getStatusSummary(application.workflow_stage)
      }
    };

    console.log('Application status for user:', {
      user_id: req.user.id,
      has_application: true,
      workflow_stage: application.workflow_stage,
      business_name: application.business_name
    });

    res.json(applicationStatus);

  } catch (error) {
    console.error('Error checking application status:', error);
    res.status(500).json({
      success: false,
      error: 'Error checking application status',
      details: error.message
    });
  }
});

// Helper function to provide user-friendly status summary
function getStatusSummary(workflowStage) {
  const statusMap = {
    'submitted': {
      status: 'Application Submitted',
      description: 'Your application has been submitted and is under review',
      color: 'blue',
      can_edit: true
    },
    'pre_screening': {
      status: 'Under Pre-Screening',
      description: 'Your application is being verified and screened',
      color: 'orange',
      can_edit: false
    },
    'under_review': {
      status: 'Under Review',
      description: 'Judges are currently reviewing your application',
      color: 'purple',
      can_edit: false
    },
    'shortlisted': {
      status: 'Shortlisted',
      description: 'Congratulations! Your application has been shortlisted',
      color: 'green',
      can_edit: false
    },
    'finalist': {
      status: 'Finalist',
      description: 'You are a finalist! Final selection is in progress',
      color: 'gold',
      can_edit: false
    },
    'winner': {
      status: 'Winner',
      description: 'Congratulations! You are a winner!',
      color: 'green',
      can_edit: false
    },
    'rejected': {
      status: 'Application Rejected',
      description: 'Your application was not selected for this round',
      color: 'red',
      can_edit: false
    }
  };

  return statusMap[workflowStage] || {
    status: 'Unknown Status',
    description: 'Application status is unclear',
    color: 'gray',
    can_edit: false
  };
}

/**
 * @route   GET /api/user/application-details
 * @desc    Get user's complete application details
 * @access  Private
 */
router.get('/application-details', async (req, res) => {
  try {
    console.log('Fetching complete application details for user:', req.user.id);
    
    // Import Application model
    const { Application } = require('../models');
    
    // Find user's application with all details
    const application = await Application.findOne({ user_id: req.user.id })
      .populate('user_id', 'first_name last_name email phone')
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application found for this user',
        data: null
      });
    }

    // Get business profile if exists
    const businessProfile = await BusinessProfile.findOne({ user_id: req.user.id }).lean();

    // Prepare complete application data
    const completeApplicationData = {
      // Application basic info
      application_id: application._id,
      business_name: application.business_name,
      category: application.category,
      workflow_stage: application.workflow_stage,
      created_at: application.createdAt,
      updated_at: application.updatedAt,
      
      // User information
      user: {
        user_id: application.user_id._id,
        first_name: application.user_id.first_name,
        last_name: application.user_id.last_name,
        email: application.user_id.email,
        phone: application.user_id.phone
      },
      
      // Business profile (if exists)
      business_profile: businessProfile || null,
      
      // Application form details (all fields that are actually stored in the database)
      application_details: {
        // Core application fields
        key_achievements: application.key_achievements,
        products_services_description: application.products_services_description,
        jobs_created: application.jobs_created,
        women_youth_percentage: application.women_youth_percentage,
        export_activity: application.export_activity,
        sustainability_initiatives: application.sustainability_initiatives,
        award_usage_plans: application.award_usage_plans,
        
        // Business details (stored in Application model, not BusinessProfile)
        business_description: application.business_description,
        business_registration_status: application.business_registration_status,
        cac_number: application.cac_number,
        sector: application.sector,
        msme_strata: application.msme_strata,
        location: application.location,
        year_established: application.year_established,
        employee_count: application.employee_count,
        revenue_band: application.revenue_band,
        website: application.website,
        social_media: application.social_media
      },
      
      // Additional application fields that are stored but not in application_details
      total_score: application.total_score,
      average_score: application.average_score,
      pre_screening: application.pre_screening,
      submission_date: application.submission_date,
      review_start_date: application.review_start_date,
      review_completion_date: application.review_completion_date,
      shortlist_date: application.shortlist_date,
      winner_announcement_date: application.winner_announcement_date,
      
      // Documents
      documents: application.documents || [],
      documents_count: application.documents ? application.documents.length : 0,
      
      // Pitch video
      pitch_video: application.pitch_video || null,
      has_pitch_video: !!application.pitch_video,
      
      // Scores (if any)
      scores: application.scores || [],
      has_scores: application.scores && application.scores.length > 0,
      
      // Status summary
      status_summary: getStatusSummary(application.workflow_stage),
      
      // Additional metadata
      metadata: {
        is_complete: application.isComplete ? application.isComplete() : false,
        can_edit: application.workflow_stage === 'submitted',
        last_modified: application.updatedAt,
        days_since_submission: application.createdAt ? 
          Math.floor((new Date() - new Date(application.createdAt)) / (1000 * 60 * 60 * 24)) : 0
      }
    };

    console.log('Complete application details retrieved for user:', {
      user_id: req.user.id,
      application_id: application._id,
      business_name: application.business_name,
      workflow_stage: application.workflow_stage,
      documents_count: completeApplicationData.documents_count,
      has_pitch_video: completeApplicationData.has_pitch_video
    });

    res.json({
      success: true,
      message: 'Complete application details retrieved successfully',
      data: completeApplicationData
    });

  } catch (error) {
    console.error('Error fetching complete application details:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching application details',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/user/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, is_read } = req.query;
    
    const query = { user_id: req.user.id };
    
    if (category) {
      query.category = category;
    }
    
    if (is_read !== undefined) {
      query.is_read = is_read === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        notifications: notifications.map(n => n.getSummary()),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/user/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      status: 'success',
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/user/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user.id, is_read: false },
      { is_read: true, read_at: new Date() }
    );

    res.json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
