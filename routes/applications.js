const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Application = require('../models/Application');
const User = require('../models/User');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nmsme-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX files are allowed.'), false);
    }
  }
});

// @desc    Create new application with documents (comprehensive)
// @route   POST /api/applications/complete
// @access  Private
router.post('/complete', [
  protect,
  upload.fields([
    { name: 'cac_certificate', maxCount: 1 },
    { name: 'tax_identification', maxCount: 1 },
    { name: 'product_photos', maxCount: 5 },
    { name: 'business_plan', maxCount: 1 },
    { name: 'financial_statements', maxCount: 1 },
    { name: 'other_documents', maxCount: 3 }
  ]),
  // Business details validation
  body('business_name')
    .trim()
    .notEmpty()
    .withMessage('Business name is required'),
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
    .notEmpty()
    .withMessage('State is required'),
  body('location.lga')
    .notEmpty()
    .withMessage('LGA is required'),
  body('year_established')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Valid year established is required'),
  body('employee_count')
    .isInt({ min: 1 })
    .withMessage('Employee count must be at least 1'),
  body('revenue_band')
    .custom((value) => {
      const validBands = [
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
      ];
      return validBands.includes(value);
    })
    .withMessage('Valid revenue band is required'),
  body('business_description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Business description must be between 10 and 500 characters'),
  // Application details validation
  body('category')
    .isIn([
      'Fashion',
      'Information Technology (IT)',
      'Agribusiness',
      'Food & Beverage',
      'Light Manufacturing',
      'Creative Enterprise',
      'Emerging Enterprise Award'
    ])
    .withMessage('Valid category is required'),
  body('key_achievements')
    .isLength({ min: 10, max: 300 })
    .withMessage('Key achievements must be between 10 and 300 characters'),
  body('products_services_description')
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
    .withMessage('Award usage plans are required'),
  // Video pitch validation
  body('pitch_video.url')
    .isURL()
    .withMessage('Valid video URL is required'),
  body('pitch_video.platform')
    .isIn(['youtube', 'vimeo'])
    .withMessage('Platform must be either youtube or vimeo')
], async (req, res) => {
  try {
    console.log('Received complete application data:', JSON.stringify(req.body, null, 2));
    console.log('Received files:', req.files);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const {
      // Business details
      business_name,
      cac_number,
      sector,
      msme_strata,
      location,
      year_established,
      employee_count,
      revenue_band,
      business_description,
      website,
      social_media,
      // Application details
      category,
      key_achievements,
      products_services_description,
      jobs_created,
      women_youth_percentage,
      export_activity,
      sustainability_initiatives,
      award_usage_plans,
      // Video pitch
      pitch_video
    } = req.body;

    // Check if user already has an application in this category
    const existingApplication = await Application.findOne({
      user_id: req.user.id,
      category: category
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'You already have an application in this category'
      });
    }

    // Process uploaded documents
    const documents = [];
    if (req.files) {
      for (const [fieldName, files] of Object.entries(req.files)) {
        for (const file of files) {
          const document = {
            filename: file.filename,
            original_name: file.originalname,
            url: file.path,
            cloudinary_id: file.filename,
            document_type: fieldName,
            size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date()
          };
          documents.push(document);
        }
      }
    }

    // Create application with all business details and documents included
    const application = new Application({
      user_id: req.user.id,
      // Business details
      business_name,
      cac_number,
      sector,
      msme_strata,
      location,
      year_established,
      employee_count,
      revenue_band,
      business_description,
      website,
      social_media: social_media || {}, // Handle empty string case
      // Application details
      category,
      workflow_stage: 'draft',
      key_achievements,
      products_services_description,
      jobs_created,
      women_youth_percentage,
      export_activity,
      sustainability_initiatives,
      award_usage_plans,
      // Video pitch
      pitch_video,
      // Documents
      documents: documents
    });

    await application.save();

    res.status(201).json({
      success: true,
      message: 'Application created successfully with documents',
      data: {
        application_id: application._id,
        workflow_stage: application.workflow_stage,
        documents_uploaded: documents.length,
        total_documents: application.documents.length
      }
    });

  } catch (error) {
    console.error('Create complete application error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // If application was created but documents failed, we should clean up
    // This is a simplified version - in production you might want more sophisticated rollback
    
    res.status(500).json({
      success: false,
      error: 'Error creating application with documents',
      details: error.message
    });
  }
});

// @desc    Create new application (original endpoint - for backward compatibility)
// @route   POST /api/applications
// @access  Private
router.post('/', [
  protect,
  // Business details validation
  body('business_name')
    .trim()
    .notEmpty()
    .withMessage('Business name is required'),
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
    .notEmpty()
    .withMessage('State is required'),
  body('location.lga')
    .notEmpty()
    .withMessage('LGA is required'),
  body('year_established')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Valid year established is required'),
  body('employee_count')
    .isInt({ min: 1 })
    .withMessage('Employee count must be at least 1'),
  body('revenue_band')
    .custom((value) => {
      const validBands = [
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
      ];
      return validBands.includes(value);
    })
    .withMessage('Valid revenue band is required'),
  body('business_description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Business description must be between 10 and 500 characters'),
  // Application details validation
  body('category')
    .isIn([
      'Fashion',
      'Information Technology (IT)',
      'Agribusiness',
      'Food & Beverage',
      'Light Manufacturing',
      'Creative Enterprise',
      'Emerging Enterprise Award'
    ])
    .withMessage('Valid category is required'),
  body('key_achievements')
    .isLength({ min: 10, max: 300 })
    .withMessage('Key achievements must be between 10 and 300 characters'),
  body('products_services_description')
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
    .withMessage('Award usage plans are required'),
  // Video pitch validation
  body('pitch_video.url')
    .isURL()
    .withMessage('Valid video URL is required'),
  body('pitch_video.platform')
    .isIn(['youtube', 'vimeo'])
    .withMessage('Platform must be either youtube or vimeo')
], async (req, res) => {
  try {
    console.log('Received application data:', JSON.stringify(req.body, null, 2));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const {
      // Business details
      business_name,
      cac_number,
      sector,
      msme_strata,
      location,
      year_established,
      employee_count,
      revenue_band,
      business_description,
      website,
      social_media,
      // Application details
      category,
      key_achievements,
      products_services_description,
      jobs_created,
      women_youth_percentage,
      export_activity,
      sustainability_initiatives,
      award_usage_plans,
      // Video pitch
      pitch_video
    } = req.body;

    // Check if user already has an application in this category
    const existingApplication = await Application.findOne({
      user_id: req.user.id,
      category: category
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'You already have an application in this category'
      });
    }

    // Create application with all business details included
    const application = new Application({
      user_id: req.user.id,
      // Business details
      business_name,
      cac_number,
      sector,
      msme_strata,
      location,
      year_established,
      employee_count,
      revenue_band,
      business_description,
      website,
      social_media: social_media || {}, // Handle empty string case
      // Application details
      category,
      workflow_stage: 'draft',
      key_achievements,
      products_services_description,
      jobs_created,
      women_youth_percentage,
      export_activity,
      sustainability_initiatives,
      award_usage_plans,
      // Video pitch
      pitch_video
    });

    await application.save();

    res.status(201).json({
      success: true,
      message: 'Application created successfully',
      data: {
        application_id: application._id,
        workflow_stage: application.workflow_stage
      }
    });

  } catch (error) {
    console.error('Create application error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      error: 'Error creating application',
      details: error.message
    });
  }
});

// @desc    Submit application (move from draft to submitted)
// @route   POST /api/applications/:id/submit
// @access  Private
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    if (application.workflow_stage !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Application can only be submitted from draft stage'
      });
    }

    // Validate application completeness
    if (!application.isCompleteForSubmission()) {
      return res.status(400).json({
        success: false,
        error: 'Application is incomplete. Please ensure all required fields and documents are provided.',
        missing_requirements: {
          required_documents: application.validateRequiredDocuments(),
          has_required_fields: !!(
            application.business_overview &&
            application.key_achievements &&
            application.products_services_description &&
            application.market_reach &&
            application.jobs_created !== undefined &&
            application.women_youth_percentage !== undefined &&
            application.export_activity.has_exports !== undefined &&
            application.sustainability_initiatives.has_initiatives !== undefined &&
            application.award_usage_plans
          )
        }
      });
    }

    // Update workflow stage
    application.workflow_stage = 'submitted';
    application.submission_date = new Date();
    await application.save();

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application_id: application._id,
        workflow_stage: application.workflow_stage,
        submission_date: application.submission_date
      }
    });

  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({
      success: false,
      error: 'Error submitting application'
    });
  }
});

// @desc    Get user's applications
// @route   GET /api/applications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, workflow_stage } = req.query;

    const query = { user_id: req.user.id };
    
    if (category) {
      query.category = category;
    }
    
    if (workflow_stage) {
      query.workflow_stage = workflow_stage;
    }

    const applications = await Application.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Application.countDocuments(query);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching applications'
    });
  }
});

// @desc    Get specific application
// @route   GET /api/applications/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching application'
    });
  }
});

// @desc    Update application
// @route   PUT /api/applications/:id
// @access  Private
router.put('/:id', [
  protect,
  // Business details validation (optional for updates)
  body('business_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Business name cannot be empty'),
  body('cac_number')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('CAC number cannot be empty'),
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
    .notEmpty()
    .withMessage('State cannot be empty'),
  body('location.lga')
    .optional()
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
  // Application details validation (optional for updates)
  body('key_achievements')
    .optional()
    .isLength({ min: 10, max: 300 })
    .withMessage('Key achievements must be between 10 and 300 characters'),
  body('products_services_description')
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

    const application = await Application.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Only allow updates if application is in draft stage
    if (application.workflow_stage !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Application can only be updated in draft stage'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'business_overview',
      'key_achievements',
      'products_services_description',
      'market_reach',
      'jobs_created',
      'women_youth_percentage',
      'export_activity',
      'sustainability_initiatives',
      'award_usage_plans'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        application[field] = req.body[field];
      }
    });

    await application.save();

    res.json({
      success: true,
      message: 'Application updated successfully',
      data: application
    });

  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating application'
    });
  }
});

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Only allow deletion if application is in draft stage
    if (application.workflow_stage !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Application can only be deleted in draft stage'
      });
    }

    await Application.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });

  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting application'
    });
  }
});

// @desc    Get application timeline
// @route   GET /api/applications/:id/timeline
// @access  Private
router.get('/:id/timeline', protect, async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const timeline = [
      {
        stage: 'draft',
        title: 'Application Draft',
        description: 'Application created and saved as draft',
        date: application.createdAt,
        completed: true
      },
      {
        stage: 'submitted',
        title: 'Application Submitted',
        description: 'Application submitted for review',
        date: application.submission_date,
        completed: application.workflow_stage !== 'draft'
      },
      {
        stage: 'pre_screening',
        title: 'Pre-Screening',
        description: 'Application under pre-screening and verification',
        date: application.pre_screening?.checked_at,
        completed: ['pre_screening', 'under_review', 'shortlisted', 'finalist', 'winner'].includes(application.workflow_stage)
      },
      {
        stage: 'under_review',
        title: 'Under Review',
        description: 'Application being reviewed by judges',
        date: application.review_start_date,
        completed: ['under_review', 'shortlisted', 'finalist', 'winner'].includes(application.workflow_stage)
      },
      {
        stage: 'shortlisted',
        title: 'Shortlisted',
        description: 'Application shortlisted for final consideration',
        date: application.shortlist_date,
        completed: ['shortlisted', 'finalist', 'winner'].includes(application.workflow_stage)
      },
      {
        stage: 'finalist',
        title: 'Finalist',
        description: 'Application selected as finalist',
        date: application.review_completion_date,
        completed: ['finalist', 'winner'].includes(application.workflow_stage)
      },
      {
        stage: 'winner',
        title: 'Winner',
        description: 'Application selected as winner',
        date: application.winner_announcement_date,
        completed: application.workflow_stage === 'winner'
      }
    ];

    res.json({
      success: true,
      data: {
        timeline,
        current_stage: application.workflow_stage,
        application_id: application._id
      }
    });

  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching timeline'
    });
  }
});

// @desc    Get application validation status
// @route   GET /api/applications/:id/validation
// @access  Private
router.get('/:id/validation', protect, async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const validation = {
      is_complete: application.isCompleteForSubmission(),
      required_documents: application.validateRequiredDocuments(),
      required_fields: {
        business_overview: !!application.business_overview,
        key_achievements: !!application.key_achievements,
        products_services_description: !!application.products_services_description,
        market_reach: !!application.market_reach,
        jobs_created: application.jobs_created !== undefined,
        women_youth_percentage: application.women_youth_percentage !== undefined,
        export_activity: application.export_activity?.has_exports !== undefined,
        sustainability_initiatives: application.sustainability_initiatives?.has_initiatives !== undefined,
        award_usage_plans: !!application.award_usage_plans
      }
    };

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Get validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching validation status'
    });
  }
});

module.exports = router;
