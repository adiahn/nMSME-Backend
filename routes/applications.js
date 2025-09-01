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

// @desc    Get all applications for the authenticated user
// @route   GET /api/applications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('Fetching applications for user:', req.user.id);
    
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      sort = '-created_at' 
    } = req.query;

    const query = { user_id: req.user.id };
    
    if (status) query.workflow_stage = status;
    if (category) query.category = category;

    console.log('Query:', query);

    const applications = await Application.find(query)
      .populate('business_profile_id', 'company_name registration_number year_established employee_count annual_revenue')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Application.countDocuments(query);

    console.log(`Found ${applications.length} applications out of ${total} total`);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// @desc    Get specific application by ID
// @route   GET /api/applications/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('user_id', 'first_name last_name email phone')
      .populate('business_profile_id', 'company_name registration_number year_established employee_count annual_revenue location');

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check if user owns this application
    if (application.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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
    .isLength({ min: 10, max: 1000 })
    .withMessage('Business description must be between 10 and 1000 characters'),
  body('category')
    .isIn(['Fashion', 'Information Technology (IT)', 'Agribusiness', 'Food & Beverage', 'Light Manufacturing', 'Creative Enterprise', 'Emerging Enterprise Award'])
    .withMessage('Valid category is required'),
  body('pitch_video.url')
    .notEmpty()
    .withMessage('Valid video URL is required'),
  body('pitch_video.platform')
    .isIn(['youtube', 'vimeo'])
    .withMessage('Platform must be either youtube or vimeo'),
  body('export_activity.has_exports')
    .isBoolean()
    .withMessage('Export activity status is required'),
  body('sustainability_initiatives.has_initiatives')
    .isBoolean()
    .withMessage('Sustainability initiatives status is required'),

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

    // Check if user already has any application (one application per user total)
    const existingApplication = await Application.findOne({
      user_id: req.user.id
    });

    if (existingApplication) {
      console.log('Duplicate application attempt blocked:', {
        user_id: req.user.id,
        existing_app_id: existingApplication._id,
        existing_stage: existingApplication.workflow_stage,
        existing_category: existingApplication.category
      });
      
      return res.status(400).json({
        success: false,
        error: 'You already have an application. Each user can only submit one application.',
        details: {
          existing_application_id: existingApplication._id,
          workflow_stage: existingApplication.workflow_stage,
          category: existingApplication.category
        }
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
      workflow_stage: 'submitted',
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
    
    console.log('Application submitted successfully:', {
      id: application._id,
      business_name: application.business_name,
      category: application.category,
      workflow_stage: application.workflow_stage
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
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



// @desc    Complete application submission with files (multipart/form-data)
// @route   POST /api/applications/complete
// @access  Private
router.post('/complete', protect, upload.fields([
  { name: 'cac_certificate', maxCount: 1 },
  { name: 'product_photos', maxCount: 5 },
  { name: 'business_plan', maxCount: 1 },
  { name: 'financial_statements', maxCount: 1 },
  { name: 'tax_clearance', maxCount: 1 },
  { name: 'insurance_certificate', maxCount: 1 },
  { name: 'quality_certification', maxCount: 1 },
  { name: 'export_license', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Received complete application data:', {
      body: req.body,
      files: req.files
    });
    
    // Log received data for debugging
    console.log('All body fields:', Object.keys(req.body));
    console.log('Body values:', Object.entries(req.body).map(([k, v]) => {
      try {
        if (typeof v === 'object' && v !== null) {
          return `${k}: [Object]`;
        }
        return `${k}: ${v}`;
      } catch (error) {
        return `${k}: [Error: ${error.message}]`;
      }
    }));

    // Parse nested objects from form data
    const parseNestedData = (data) => {
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        try {
          if (key.includes('[') && key.includes(']')) {
            // Handle bracket notation like 'location[state]'
            const match = key.match(/^(\w+)\[(\w+)\]$/);
            if (match) {
              const [, parentKey, childKey] = match;
              if (!result[parentKey]) result[parentKey] = {};
              result[parentKey][childKey] = value;
            }
          } else {
            // Handle case where value might be a stringified JSON object
            if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
              try {
                const parsedValue = JSON.parse(value);
                // Only use parsed value if it's not already handled by bracket notation
                if (!result[key] || Object.keys(result[key]).length === 0) {
                  result[key] = parsedValue;
                }
              } catch (parseError) {
                // If JSON parsing fails, use the original string value
                result[key] = value;
              }
            } else {
              result[key] = value;
            }
          }
        } catch (error) {
          console.log(`Error parsing field ${key}:`, error.message);
          result[key] = value; // Fallback to original value
        }
      }
      return result;
    };

    const parsedData = parseNestedData(req.body);
    console.log('Parsed data:', parsedData);

    // Validate required fields
    const requiredFields = [
      'business_name', 'cac_number', 'sector', 'msme_strata', 
      'location', 'year_established', 'employee_count', 'revenue_band',
      'business_description', 'category', 'export_activity', 'sustainability_initiatives'
    ];

    // Special validation for pitch_video (can be object or string)
    let pitchVideoValid = false;
    if (parsedData.pitch_video) {
      if (typeof parsedData.pitch_video === 'string') {
        // Handle stringified JSON
        try {
          const parsedVideo = JSON.parse(parsedData.pitch_video);
          pitchVideoValid = parsedVideo && parsedVideo.url && parsedVideo.url.trim() !== '';
        } catch (parseError) {
          // If not JSON, check if it's a direct URL string
          pitchVideoValid = parsedData.pitch_video.trim() !== '';
        }
      } else if (typeof parsedData.pitch_video === 'object') {
        // Handle object format
        pitchVideoValid = parsedData.pitch_video.url && parsedData.pitch_video.url.trim() !== '';
      }
    }
    
    if (!pitchVideoValid) {
      return res.status(400).json({
        success: false,
        error: 'pitch_video is required and must have a valid URL',
        details: 'Received pitch_video data: ' + JSON.stringify(parsedData.pitch_video)
      });
    }

    // Validate required boolean fields
    if (!parsedData.export_activity || 
        (typeof parsedData.export_activity.has_exports !== 'boolean' && 
         typeof parsedData.export_activity.has_exports !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'export_activity.has_exports is required and must be a boolean value'
      });
    }

    if (!parsedData.sustainability_initiatives || 
        (typeof parsedData.sustainability_initiatives.has_initiatives !== 'boolean' && 
         typeof parsedData.sustainability_initiatives.has_initiatives !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'sustainability_initiatives.has_initiatives is required and must be a boolean value'
      });
    }

    for (const field of requiredFields) {
      console.log(`Validating ${field}:`, parsedData[field]);
      
      // Handle different field types properly
      let isValid = false;
      if (field === 'location') {
        // Location is an object, check if it has required properties
        isValid = parsedData[field] && 
                  parsedData[field].state && 
                  parsedData[field].state.toString().trim() !== '' &&
                  parsedData[field].lga && 
                  parsedData[field].lga.toString().trim() !== '';
      } else if (field === 'export_activity') {
        // Export activity is an object, already validated above
        isValid = true;
      } else if (field === 'sustainability_initiatives') {
        // Sustainability initiatives is an object, already validated above
        isValid = true;
      } else {
        // Regular string fields
        isValid = parsedData[field] && parsedData[field].toString().trim() !== '';
      }
      
      if (!isValid) {
        console.log(`Field ${field} validation failed:`, parsedData[field]);
        return res.status(400).json({
          success: false,
          error: `${field} is required and cannot be empty`,
          details: `Field '${field}' was received as: ${JSON.stringify(parsedData[field])}`
        });
      }
    }

    // Check if user already has any application (one application per user total)
    const existingApplication = await Application.findOne({
      user_id: req.user.id
    });

    if (existingApplication) {
      console.log('Duplicate application attempt blocked (complete endpoint):', {
        user_id: req.user.id,
        existing_app_id: existingApplication._id,
        existing_stage: existingApplication.workflow_stage,
        existing_category: existingApplication.category
      });
      
      return res.status(400).json({
        success: false,
        error: 'You already have an application. Each user can only submit one application.',
        details: {
          existing_application_id: existingApplication._id,
          workflow_stage: existingApplication.workflow_stage,
          category: existingApplication.category
        }
      });
    }

    // Process uploaded files
    const documents = [];
    if (req.files) {
      for (const [fieldName, files] of Object.entries(req.files)) {
        for (const file of files) {
          // Handle Cloudinary response properly
          const documentData = {
            filename: file.originalname || fieldName,
            original_name: file.originalname || fieldName,
            url: file.path || file.secure_url,
            cloudinary_id: file.filename || file.public_id,
            document_type: fieldName,
            size: file.size || 0,
            mime_type: file.mimetype || 'application/octet-stream',
            uploaded_at: new Date()
          };
          
          // Only add required fields that exist
          if (documentData.url) {
            documents.push(documentData);
          }
        }
      }
    }

    // Create application
    const application = new Application({
      user_id: req.user.id,
      // Business details
      business_name: parsedData.business_name,
      cac_number: parsedData.cac_number,
      sector: parsedData.sector,
      msme_strata: parsedData.msme_strata,
      location: parsedData.location,
      year_established: parseInt(parsedData.year_established),
      employee_count: parseInt(parsedData.employee_count),
      revenue_band: parsedData.revenue_band,
      business_description: parsedData.business_description,
      website: parsedData.website,
      social_media: parsedData.social_media || {},
      // Application details
      category: parsedData.category,
      workflow_stage: 'submitted', // Application is submitted immediately
      key_achievements: parsedData.key_achievements,
      products_services_description: parsedData.products_services_description,

      jobs_created: parseInt(parsedData.jobs_created) || 0,
      women_youth_percentage: parseInt(parsedData.women_youth_percentage) || 0,
      export_activity: {
        has_exports: parsedData.export_activity.has_exports === 'true' || parsedData.export_activity.has_exports === true,
        export_details: parsedData.export_activity.export_details || ''
      },
      sustainability_initiatives: {
        has_initiatives: parsedData.sustainability_initiatives.has_initiatives === 'true' || parsedData.sustainability_initiatives.has_initiatives === true,
        initiative_details: parsedData.sustainability_initiatives.initiative_details || ''
      },
      award_usage_plans: parsedData.award_usage_plans,
      // Video pitch - handle both object and stringified JSON
      pitch_video: (() => {
        if (typeof parsedData.pitch_video === 'string' && parsedData.pitch_video.startsWith('{')) {
          try {
            return JSON.parse(parsedData.pitch_video);
          } catch (error) {
            console.log('Error parsing pitch_video JSON:', error.message);
            return parsedData.pitch_video;
          }
        }
        return parsedData.pitch_video;
      })(),
      // Documents
      documents: documents
    });

    await application.save();

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully with documents',
      data: {
        application_id: application._id,
        workflow_stage: application.workflow_stage,
        documents_uploaded: documents.length,
        total_documents: documents.length
      }
    });

  } catch (error) {
    console.error('Complete application submission error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Provide more specific error messages
    let errorMessage = 'Error creating application';
    let errorDetails = error.message;
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Validation error';
      errorDetails = Object.values(error.errors).map(err => err.message).join(', ');
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate application error';
      errorDetails = 'You already have an application';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
});

// @desc    Update application
// @route   PUT /api/applications/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check if user owns this application
    if (application.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if application can be updated
    if (application.workflow_stage === 'submitted' || application.workflow_stage === 'under_review') {
      return res.status(400).json({
        success: false,
        error: 'Application cannot be updated after submission'
      });
    }

    // Update application
    const updatedApplication = await Application.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Application updated successfully',
      data: updatedApplication
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
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check if user owns this application
    if (application.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if application can be deleted
    if (application.workflow_stage === 'submitted' || application.workflow_stage === 'under_review') {
      return res.status(400).json({
        success: false,
        error: 'Application cannot be deleted after submission'
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

module.exports = router;


