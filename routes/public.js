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

module.exports = router;
