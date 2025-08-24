const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  User, Application, BusinessProfile, Judge, ApplicationAssignment, 
  Score, Notification, SystemSetting, ApplicationTimeline 
} = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin authorization middleware to all routes
router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard with comprehensive statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get overall statistics
    const totalUsers = await User.countDocuments({ role: 'applicant' });
    const totalApplications = await Application.countDocuments();
    const totalJudges = await Judge.countDocuments({ is_active: true });
    const submittedApplications = await Application.countDocuments({ status: 'submitted' });
    const underReviewApplications = await Application.countDocuments({ status: 'under_review' });
    const shortlistedApplications = await Application.countDocuments({ status: 'shortlisted' });

    // Get applications by category
    const applicationsByCategory = await Application.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get applications by status
    const applicationsByStatus = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get recent activities
    const recentApplications = await Application.find()
      .sort({ created_at: -1 })
      .limit(10)
      .populate('user_id', 'first_name last_name email')


    const recentScores = await Score.find()
      .sort({ scored_at: -1 })
      .limit(10)
      .populate('judge_id', 'user_id')
      .populate('judge_id.user_id', 'first_name last_name')
      .populate('application_id', 'category');

    // Get current phase
    const currentPhase = await ApplicationTimeline.getCurrentPhase();

    res.json({
      status: 'success',
      data: {
        overview: {
          total_users: totalUsers,
          total_applications: totalApplications,
          total_judges: totalJudges,
          submitted_applications: submittedApplications,
          under_review_applications: underReviewApplications,
          shortlisted_applications: shortlistedApplications
        },
        applications_by_category: applicationsByCategory,
        applications_by_status: applicationsByStatus,
        recent_applications: recentApplications,
        recent_scores: recentScores,
        current_phase: currentPhase ? currentPhase.phase : null
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/applications
 * @desc    Get all applications with filtering and pagination
 * @access  Private (Admin only)
 */
router.get('/applications', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category, 
      sector, 
      state,
      sort = '-created_at' 
    } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (category) query.category = category;

    let applications = await Application.find(query)
      .populate('user_id', 'first_name last_name email phone')

      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Filter by business profile fields if specified
    if (sector || state) {
      applications = applications.filter(app => {
            if (sector && app.sector !== sector) return false;
    if (state && app.location?.state !== state) return false;
        return true;
      });
    }

    const total = await Application.countDocuments(query);

    res.json({
      status: 'success',
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
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/applications/:id
 * @desc    Get specific application details
 * @access  Private (Admin only)
 */
router.get('/applications/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('user_id', 'first_name last_name email phone')


    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Get scores for this application
    const scores = await Score.find({ application_id: application._id })
      .populate('judge_id', 'user_id')
      .populate('judge_id.user_id', 'first_name last_name');

    // Get assignments for this application
    const assignments = await ApplicationAssignment.find({ application_id: application._id })
      .populate('judge_id', 'user_id')
      .populate('judge_id.user_id', 'first_name last_name');

    res.json({
      status: 'success',
      data: {
        application,
        scores,
        assignments
      }
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/admin/applications/:id/status
 * @desc    Update application status
 * @access  Private (Admin only)
 */
router.put('/applications/:id/status', [
  body('status')
    .isIn(['draft', 'submitted', 'under_review', 'shortlisted', 'finalist', 'winner', 'rejected'])
    .withMessage('Invalid application status'),
  body('review_comments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review comments cannot exceed 1000 characters'),
  body('rejection_reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason cannot exceed 500 characters')
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

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    const { status, review_comments, rejection_reason } = req.body;

    // Update application
    application.status = status;
    if (review_comments) application.review_comments = review_comments;
    if (rejection_reason) application.rejection_reason = rejection_reason;

    await application.save();

    // Send notification to applicant
    await Notification.createApplicationNotification(
      application.user_id,
      'application_reviewed',
      application._id,
      'Application Status Updated',
      `Your application status has been updated to: ${status}`,
      'high'
    );

    res.json({
      status: 'success',
      message: 'Application status updated successfully',
      data: {
        application
      }
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/judges
 * @desc    Get all judges with statistics
 * @access  Private (Admin only)
 */
router.get('/judges', async (req, res) => {
  try {
    const { page = 1, limit = 20, is_active, sector } = req.query;

    const query = {};
    if (is_active !== undefined) query.is_active = is_active === 'true';
    if (sector) query.expertise_sectors = sector;

    const judges = await Judge.find(query)
      .populate('user_id', 'first_name last_name email')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Judge.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        judges: judges.map(judge => ({
          _id: judge._id,
          user: judge.user_id,
          expertise_sectors: judge.expertise_sectors,
          is_active: judge.is_active,
          assigned_applications_count: judge.assigned_applications_count,
          total_scores_submitted: judge.total_scores_submitted,
          completion_rate: judge.completion_rate,
          average_score_given: judge.average_score_given,
          available_capacity: judge.available_capacity
        })),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching judges:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/admin/judges/:judgeId/assign
 * @desc    Assign applications to a judge
 * @access  Private (Admin only)
 */
router.post('/judges/:judgeId/assign', [
  body('application_ids')
    .isArray({ min: 1 })
    .withMessage('At least one application must be selected'),
  body('application_ids.*')
    .isMongoId()
    .withMessage('Invalid application ID')
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

    const judge = await Judge.findById(req.params.judgeId);
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge not found'
      });
    }

    const { application_ids } = req.body;
    const assignments = [];

    for (const applicationId of application_ids) {
      // Check if application exists and is submitted
      const application = await Application.findById(applicationId);
      if (!application) {
        continue;
      }

      if (application.status !== 'submitted') {
        continue;
      }

      // Check if assignment already exists
      const existingAssignment = await ApplicationAssignment.findOne({
        application_id: applicationId,
        judge_id: judge._id
      });

      if (existingAssignment) {
        continue;
      }

      // Create assignment
      const assignment = new ApplicationAssignment({
        application_id: applicationId,
        judge_id: judge._id,
        status: 'assigned'
      });

      await assignment.save();
      assignments.push(assignment);

      // Update judge statistics
      await judge.assignApplication(applicationId, application.category);

      // Send notification to judge
      await Notification.createSystemNotification(
        judge.user_id,
        'New Assignment',
        `You have been assigned a new application in the ${application.category} category.`,
        'medium'
      );
    }

    res.json({
      status: 'success',
      message: `${assignments.length} application(s) assigned successfully`,
      data: {
        assignments
      }
    });
  } catch (error) {
    console.error('Error assigning applications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/admin/judges/:judgeId/status
 * @desc    Update judge status (active/inactive)
 * @access  Private (Admin only)
 */
router.put('/judges/:judgeId/status', [
  body('is_active')
    .isBoolean()
    .withMessage('is_active must be a boolean value')
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

    const judge = await Judge.findById(req.params.judgeId);
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge not found'
      });
    }

    judge.is_active = req.body.is_active;
    await judge.save();

    res.json({
      status: 'success',
      message: `Judge ${req.body.is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        judge: {
          _id: judge._id,
          is_active: judge.is_active
        }
      }
    });
  } catch (error) {
    console.error('Error updating judge status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/settings
 * @desc    Get system settings
 * @access  Private (Admin only)
 */
router.get('/settings', async (req, res) => {
  try {
    const { category } = req.query;
    
    const query = {};
    if (category) query.category = category;

    const settings = await SystemSetting.find(query).sort({ category: 1, key: 1 });

    res.json({
      status: 'success',
      data: {
        settings: settings.map(setting => setting.getSummary())
      }
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/admin/settings/:key
 * @desc    Update system setting
 * @access  Private (Admin only)
 */
router.put('/settings/:key', [
  body('value')
    .notEmpty()
    .withMessage('Value is required')
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

    const setting = await SystemSetting.getByKey(req.params.key);
    if (!setting) {
      return res.status(404).json({
        status: 'error',
        message: 'Setting not found'
      });
    }

    await setting.updateValue(req.body.value, req.user.id, 'Admin update');

    res.json({
      status: 'success',
      message: 'Setting updated successfully',
      data: {
        setting: setting.getSummary()
      }
    });
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get comprehensive analytics data
 * @access  Private (Admin only)
 */
router.get('/analytics', async (req, res) => {
  try {
    // Applications by category and status
    const applicationsByCategoryStatus = await Application.aggregate([
      { $group: { 
        _id: { category: '$category', status: '$status' }, 
        count: { $sum: 1 } 
      }},
      { $group: { 
        _id: '$_id.category', 
        statuses: { $push: { status: '$_id.status', count: '$count' } },
        total: { $sum: '$count' }
      }},
      { $sort: { total: -1 } }
    ]);

    // Average scores by category
    const averageScoresByCategory = await Score.aggregate([
      { $lookup: {
        from: 'applications',
        localField: 'application_id',
        foreignField: '_id',
        as: 'application'
      }},
      { $unwind: '$application' },
      { $group: {
        _id: '$application.category',
        avg_score: { $avg: '$total_score' },
        count: { $sum: 1 }
      }},
      { $sort: { avg_score: -1 } }
    ]);

    // Judge performance statistics
    const judgePerformance = await Judge.aggregate([
      { $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $project: {
        judge_name: { $concat: ['$user.first_name', ' ', '$user.user.last_name'] },
        assigned_count: '$assigned_applications_count',
        completed_count: '$total_scores_submitted',
        completion_rate: { $multiply: [{ $divide: ['$total_scores_submitted', '$assigned_applications_count'] }, 100] },
        avg_score: '$average_score_given'
      }},
      { $sort: { completion_rate: -1 } }
    ]);

    // Timeline statistics
    const timelineStats = await ApplicationTimeline.aggregate([
      { $group: {
        _id: '$phase',
        count: { $sum: 1 },
        active: { $sum: { $cond: ['$is_active', 1, 0] } }
      }}
    ]);

    res.json({
      status: 'success',
      data: {
        applications_by_category_status: applicationsByCategoryStatus,
        average_scores_by_category: averageScoresByCategory,
        judge_performance: judgePerformance,
        timeline_statistics: timelineStats
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/admin/initialize-settings
 * @desc    Initialize default system settings
 * @access  Private (Admin only)
 */
router.post('/initialize-settings', async (req, res) => {
  try {
    await SystemSetting.initializeDefaults();

    res.json({
      status: 'success',
      message: 'System settings initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing system settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
