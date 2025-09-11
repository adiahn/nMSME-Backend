const express = require('express');
const router = express.Router();

// Placeholder for public routes
router.get('/', (req, res) => {
  res.json({ message: 'Public routes - to be implemented' });
});

/**
 * @route   GET /api/public/debug/users
 * @desc    Get all users (public debug endpoint)
 * @access  Public
 */
router.get('/debug/users', async (req, res) => {
  try {
    console.log('Public debug endpoint: Checking all users');
    
    const { User } = require('../models');
    const users = await User.find()
      .sort('-createdAt')
      .select('first_name last_name email phone role account_status is_verified is_active createdAt updatedAt');

    console.log(`Found ${users.length} users in database`);

    res.json({
      success: true,
      message: 'Public debug endpoint - All users',
      count: users.length,
      timestamp: new Date().toISOString(),
      users: users.map(user => ({
        id: user._id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone,
        role: user.role,
        account_status: user.account_status,
        is_verified: user.is_verified,
        is_active: user.is_active,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
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

/**
 * @route   GET /api/public/reviewed-applications
 * @desc    Get all reviewed applications with scores (public endpoint)
 * @access  Public
 */
router.get('/reviewed-applications', async (req, res) => {
  try {
    console.log('Public endpoint: Fetching reviewed applications');
    
    const { Application, Score, Judge, User } = require('../models');
    
    // Get applications that have been scored (under_review or beyond)
    const applications = await Application.find({
      workflow_stage: { $in: ['under_review', 'shortlisted', 'finalist', 'winner'] }
    })
    .populate('user_id', 'first_name last_name email')
    .sort('-updatedAt')
    .lean();

    console.log(`Found ${applications.length} reviewed applications`);

    // Get scores for these applications
    const applicationIds = applications.map(app => app._id);
    const scores = await Score.find({
      application_id: { $in: applicationIds }
    })
    .populate({
      path: 'judge_id',
      populate: {
        path: 'user_id',
        select: 'first_name last_name'
      }
    })
    .lean();

    // Group scores by application
    const scoresByApplication = {};
    scores.forEach(score => {
      if (!scoresByApplication[score.application_id]) {
        scoresByApplication[score.application_id] = [];
      }
      scoresByApplication[score.application_id].push(score);
    });

    // Format response
    const reviewedApplications = applications.map(app => {
      const appScores = scoresByApplication[app._id] || [];
      const averageScore = appScores.length > 0 
        ? appScores.reduce((sum, score) => sum + score.total_score, 0) / appScores.length 
        : 0;

      return {
        id: app._id,
        business_name: app.business_name,
        category: app.category,
        sector: app.sector,
        msme_strata: app.msme_strata,
        workflow_stage: app.workflow_stage,
        status_display: getPublicStatusDisplay(app.workflow_stage),
        applicant: {
          name: `${app.user_id.first_name} ${app.user_id.last_name}`,
          email: app.user_id.email
        },
        created_at: app.createdAt,
        updated_at: app.updatedAt,
        scoring: {
          total_scores: appScores.length,
          average_score: Math.round(averageScore * 100) / 100,
          scores: appScores.map(score => ({
            judge_name: score.judge_id && score.judge_id.user_id 
              ? `${score.judge_id.user_id.first_name} ${score.judge_id.user_id.last_name}`
              : 'Unknown Judge',
            total_score: score.total_score,
            grade: score.grade,
            scored_at: score.scored_at,
            comments: score.comments,
            criteria_scores: {
              business_viability_financial_health: score.business_viability_financial_health,
              market_opportunity_traction: score.market_opportunity_traction,
              social_impact_job_creation: score.social_impact_job_creation,
              innovation_technology_adoption: score.innovation_technology_adoption,
              sustainability_environmental_impact: score.sustainability_environmental_impact,
              management_leadership: score.management_leadership
            }
          }))
        }
      };
    });

    res.json({
      success: true,
      message: 'Reviewed applications retrieved successfully',
      count: reviewedApplications.length,
      timestamp: new Date().toISOString(),
      applications: reviewedApplications
    });

  } catch (error) {
    console.error('Error fetching reviewed applications:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching reviewed applications',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/public/reviewed-applications/summary
 * @desc    Get summary statistics of reviewed applications (public endpoint)
 * @access  Public
 */
router.get('/reviewed-applications/summary', async (req, res) => {
  try {
    console.log('Public endpoint: Fetching reviewed applications summary');
    
    const { Application, Score } = require('../models');
    
    // Get counts by workflow stage
    const stageCounts = await Application.aggregate([
      {
        $match: {
          workflow_stage: { $in: ['under_review', 'shortlisted', 'finalist', 'winner'] }
        }
      },
      {
        $group: {
          _id: '$workflow_stage',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total reviewed applications
    const totalReviewed = await Application.countDocuments({
      workflow_stage: { $in: ['under_review', 'shortlisted', 'finalist', 'winner'] }
    });

    // Get scoring statistics
    const scoringStats = await Score.aggregate([
      {
        $group: {
          _id: null,
          total_scores: { $sum: 1 },
          average_score: { $avg: '$total_score' },
          highest_score: { $max: '$total_score' },
          lowest_score: { $min: '$total_score' }
        }
      }
    ]);

    // Get grade distribution
    const gradeDistribution = await Score.aggregate([
      {
        $group: {
          _id: '$grade',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      message: 'Reviewed applications summary retrieved successfully',
      timestamp: new Date().toISOString(),
      summary: {
        total_reviewed_applications: totalReviewed,
        stage_distribution: stageCounts.reduce((acc, stage) => {
          acc[stage._id] = stage.count;
          return acc;
        }, {}),
        scoring_statistics: scoringStats[0] || {
          total_scores: 0,
          average_score: 0,
          highest_score: 0,
          lowest_score: 0
        },
        grade_distribution: gradeDistribution
      }
    });

  } catch (error) {
    console.error('Error fetching reviewed applications summary:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching reviewed applications summary',
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
