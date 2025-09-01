const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const BusinessProfile = require('../models/BusinessProfile');
const User = require('../models/User');

// @desc    Create business profile
// @route   POST /api/business-profile
// @access  Private
router.post('/', [
  protect,
  body('business_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('cac_number')
    .trim()
    .notEmpty()
    .withMessage('CAC number is required'),
  body('sector')
    .isIn([
      'Fashion',
      'Information Technology (IT)',
      'Agribusiness',
      'Food & Beverage',
      'Light Manufacturing',
      'Creative Enterprise',
      'Emerging Enterprise Award'
    ])
    .withMessage('Valid sector is required'),
  body('msme_strata')
    .isIn(['nano', 'micro', 'small', 'medium'])
    .withMessage('Valid MSME strata is required'),
  body('location.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('location.lga')
    .trim()
    .notEmpty()
    .withMessage('LGA is required'),
  body('year_established')
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Valid year established is required'),
  body('employee_count')
    .isInt({ min: 1 })
    .withMessage('Employee count must be at least 1'),
  body('revenue_band')
    .isIn([
      'Less than ₦100,000/month',
      '₦100,000 - ₦500,000/month',
      '₦500,000 - ₦1,000,000/month',
      '₦1,000,000 - ₦5,000,000/month',
      '₦5,000,000 - ₦10,000,000/month',
      'Above ₦10,000,000/month'
    ])
    .withMessage('Valid revenue band is required'),
  body('business_description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Business description must be between 10 and 500 characters'),
  body('key_achievements')
    .isLength({ min: 10, max: 300 })
    .withMessage('Key achievements must be between 10 and 300 characters'),
  body('products_services')
    .notEmpty()
    .withMessage('Products/services description is required'),

  body('jobs_created')
    .isInt({ min: 0 })
    .withMessage('Jobs created must be a non-negative number'),
  body('women_youth_percentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Women/youth percentage must be between 0 and 100'),
  body('export_activity.has_exports')
    .isBoolean()
    .withMessage('Export activity status is required'),
  body('sustainability_initiatives.has_initiatives')
    .isBoolean()
    .withMessage('Sustainability initiatives status is required'),
  body('award_usage_plans')
    .notEmpty()
    .withMessage('Award usage plans are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    // Check if user already has a business profile
    const existingProfile = await BusinessProfile.findOne({ user_id: req.user.id });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        error: 'Business profile already exists for this user'
      });
    }

    // Check if CAC number is already used
    const existingCAC = await BusinessProfile.findOne({ cac_number: req.body.cac_number });
    if (existingCAC) {
      return res.status(400).json({
        success: false,
        error: 'CAC number is already registered'
      });
    }

    const businessProfile = new BusinessProfile({
      user_id: req.user.id,
      ...req.body
    });

    await businessProfile.save();

    res.status(201).json({
      success: true,
      message: 'Business profile created successfully',
      data: businessProfile
    });

  } catch (error) {
    console.error('Create business profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating business profile'
    });
  }
});

// @desc    Get business profile
// @route   GET /api/business-profile/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const businessProfile = await BusinessProfile.findById(req.params.id)
      .populate('user_id', 'first_name last_name email phone');

    if (!businessProfile) {
      return res.status(404).json({
        success: false,
        error: 'Business profile not found'
      });
    }

    // Check if user owns this profile or is admin
    if (businessProfile.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this business profile'
      });
    }

    res.json({
      success: true,
      data: businessProfile
    });

  } catch (error) {
    console.error('Get business profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching business profile'
    });
  }
});

// @desc    Get user's business profile
// @route   GET /api/business-profile/user/profile
// @access  Private
router.get('/user/profile', protect, async (req, res) => {
  try {
    const businessProfile = await BusinessProfile.findOne({ user_id: req.user.id })
      .populate('user_id', 'first_name last_name email phone');

    if (!businessProfile) {
      return res.status(404).json({
        success: false,
        error: 'Business profile not found'
      });
    }

    res.json({
      success: true,
      data: businessProfile
    });

  } catch (error) {
    console.error('Get user business profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching business profile'
    });
  }
});

// @desc    Update business profile
// @route   PUT /api/business-profile/:id
// @access  Private
router.put('/:id', [
  protect,
  body('business_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('sector')
    .optional()
    .isIn([
      'Fashion',
      'Information Technology (IT)',
      'Agribusiness',
      'Food & Beverage',
      'Light Manufacturing',
      'Creative Enterprise',
      'Emerging Enterprise Award'
    ])
    .withMessage('Valid sector is required'),
  body('msme_strata')
    .optional()
    .isIn(['nano', 'micro', 'small', 'medium'])
    .withMessage('Valid MSME strata is required'),
  body('location.state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty'),
  body('location.lga')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('LGA cannot be empty'),
  body('year_established')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Valid year established is required'),
  body('employee_count')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Employee count must be at least 1'),
  body('revenue_band')
    .optional()
    .isIn([
      'Less than ₦100,000/month',
      '₦100,000 - ₦500,000/month',
      '₦500,000 - ₦1,000,000/month',
      '₦1,000,000 - ₦5,000,000/month',
      '₦5,000,000 - ₦10,000,000/month',
      'Above ₦10,000,000/month'
    ])
    .withMessage('Valid revenue band is required'),
  body('business_description')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Business description must be between 10 and 500 characters'),
  body('key_achievements')
    .optional()
    .isLength({ min: 10, max: 300 })
    .withMessage('Key achievements must be between 10 and 300 characters'),
  body('products_services')
    .optional()
    .notEmpty()
    .withMessage('Products/services description cannot be empty'),

  body('jobs_created')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Jobs created must be a non-negative number'),
  body('women_youth_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Women/youth percentage must be between 0 and 100'),
  body('award_usage_plans')
    .optional()
    .notEmpty()
    .withMessage('Award usage plans cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const businessProfile = await BusinessProfile.findById(req.params.id);

    if (!businessProfile) {
      return res.status(404).json({
        success: false,
        error: 'Business profile not found'
      });
    }

    // Check if user owns this profile
    if (businessProfile.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this business profile'
      });
    }

    // Check if CAC number is being changed and if it's already used
    if (req.body.cac_number && req.body.cac_number !== businessProfile.cac_number) {
      const existingCAC = await BusinessProfile.findOne({ 
        cac_number: req.body.cac_number,
        _id: { $ne: req.params.id }
      });
      if (existingCAC) {
        return res.status(400).json({
          success: false,
          error: 'CAC number is already registered'
        });
      }
    }

    // Update allowed fields
    const allowedFields = [
      'business_name',
      'cac_number',
      'sector',
      'msme_strata',
      'location',
      'year_established',
      'employee_count',
      'revenue_band',
      'business_description',
      'key_achievements',
      'products_services',

      'website',
      'social_media',
      'jobs_created',
      'women_youth_percentage',
      'export_activity',
      'sustainability_initiatives',
      'award_usage_plans'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        businessProfile[field] = req.body[field];
      }
    });

    await businessProfile.save();

    res.json({
      success: true,
      message: 'Business profile updated successfully',
      data: businessProfile
    });

  } catch (error) {
    console.error('Update business profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating business profile'
    });
  }
});

// @desc    Delete business profile
// @route   DELETE /api/business-profile/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const businessProfile = await BusinessProfile.findById(req.params.id);

    if (!businessProfile) {
      return res.status(404).json({
        success: false,
        error: 'Business profile not found'
      });
    }

    // Check if user owns this profile
    if (businessProfile.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this business profile'
      });
    }

    await BusinessProfile.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Business profile deleted successfully'
    });

  } catch (error) {
    console.error('Delete business profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting business profile'
    });
  }
});

// @desc    Get business profiles by sector
// @route   GET /api/business-profile/sector/:sector
// @access  Public
router.get('/sector/:sector', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { sector } = req.params;

    const businessProfiles = await BusinessProfile.find({ sector })
      .populate('user_id', 'first_name last_name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await BusinessProfile.countDocuments({ sector });

    res.json({
      success: true,
      data: {
        business_profiles: businessProfiles,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get business profiles by sector error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching business profiles'
    });
  }
});

// @desc    Get business profiles by MSME strata
// @route   GET /api/business-profile/strata/:strata
// @access  Public
router.get('/strata/:strata', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { strata } = req.params;

    const businessProfiles = await BusinessProfile.find({ msme_strata: strata })
      .populate('user_id', 'first_name last_name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await BusinessProfile.countDocuments({ msme_strata: strata });

    res.json({
      success: true,
      data: {
        business_profiles: businessProfiles,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get business profiles by strata error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching business profiles'
    });
  }
});

module.exports = router;
