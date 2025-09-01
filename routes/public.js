const express = require('express');
const router = express.Router();

// Placeholder for public routes
router.get('/', (req, res) => {
  res.json({ message: 'Public routes - to be implemented' });
});

/**
 * @route   GET /api/public/debug/applications
 * @desc    Get all applications (public debug endpoint)
 * @access  Public
 */
router.get('/debug/applications', async (req, res) => {
  try {
    console.log('Public debug endpoint: Checking all applications');
    
    const { Application } = require('../models');
    const applications = await Application.find()
      .sort('-createdAt')
      .select('business_name category sector workflow_stage createdAt updatedAt documents pitch_video');

    console.log(`Found ${applications.length} applications in database`);

    res.json({
      success: true,
      message: 'Public debug endpoint - All applications',
      count: applications.length,
      timestamp: new Date().toISOString(),
      applications: applications.map(app => ({
        id: app._id,
        business_name: app.business_name,
        category: app.category,
        sector: app.sector,
        workflow_stage: app.workflow_stage,
        created_at: app.createdAt,
        updated_at: app.updatedAt,
        documents_count: app.documents ? app.documents.length : 0,
        has_pitch_video: !!app.pitch_video
      }))
    });
  } catch (error) {
    console.error('Error in public debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching applications',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/public/check-application-status
 * @desc    Check application status by business name or email (public endpoint)
 * @access  Public
 */
router.get('/check-application-status', async (req, res) => {
  try {
    const { business_name, email } = req.query;
    
    if (!business_name && !email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either business_name or email parameter'
      });
    }

    console.log('Public application status check:', { business_name, email });
    
    // Import models
    const { Application, User } = require('../models');
    
    let query = {};
    
    if (business_name) {
      query.business_name = { $regex: business_name, $options: 'i' }; // Case-insensitive search
    } else if (email) {
      // Find user by email first, then find their application
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.json({
          success: true,
          found: false,
          message: 'No user found with this email address'
        });
      }
      query.user_id = user._id;
    }

    // Find application(s)
    const applications = await Application.find(query)
      .select('business_name category workflow_stage createdAt documents pitch_video')
      .lean();

    if (applications.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: 'No application found with the provided criteria'
      });
    }

    // Return application status(es)
    const results = applications.map(app => ({
      business_name: app.business_name,
      category: app.category,
      workflow_stage: app.workflow_stage,
      status_display: getPublicStatusDisplay(app.workflow_stage),
      created_at: app.createdAt,
      documents_count: app.documents ? app.documents.length : 0,
      has_pitch_video: !!app.pitch_video
    }));

    res.json({
      success: true,
      found: true,
      message: `Found ${applications.length} application(s)`,
      count: applications.length,
      applications: results
    });

  } catch (error) {
    console.error('Error in public application status check:', error);
    res.status(500).json({
      success: false,
      error: 'Error checking application status',
      details: error.message
    });
  }
});

// Helper function for public status display
function getPublicStatusDisplay(workflowStage) {
  const statusMap = {
    'submitted': 'Application Submitted',
    'pre_screening': 'Under Pre-Screening',
    'under_review': 'Under Review',
    'shortlisted': 'Shortlisted',
    'finalist': 'Finalist',
    'winner': 'Winner',
    'rejected': 'Application Rejected'
  };

  return statusMap[workflowStage] || 'Unknown Status';
}

module.exports = router;
