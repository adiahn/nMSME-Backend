const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { Judge, Application, ApplicationAssignment, Score, Notification, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and judge authorization middleware to all routes
router.use(protect);
router.use(authorize('judge'));

/**
 * @route   GET /api/judge/dashboard
 * @desc    Get judge dashboard with assigned applications and statistics
 * @access  Private (Judge only)
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    // Get assigned applications
    const assignments = await ApplicationAssignment.find({ judge_id: judge._id })
      .populate('application_id', 'category business_description workflow_stage submission_date')
      .populate('application_id.user_id', 'first_name last_name');

    // Get recent scores
    const recentScores = await Score.find({ judge_id: judge._id })
      .sort({ scored_at: -1 })
      .limit(5)
      .populate('application_id', 'category business_description workflow_stage');

    // Calculate statistics
    const stats = {
      total_assigned: judge.assigned_applications_count,
      completed_reviews: judge.total_scores_submitted,
      pending_reviews: judge.assigned_applications_count - judge.total_scores_submitted,
      completion_rate: judge.completion_rate,
      average_score: judge.average_score_given,
      available_capacity: judge.available_capacity
    };

    res.json({
      status: 'success',
      data: {
        judge_profile: {
          expertise_sectors: judge.expertise_sectors,
          max_applications: judge.max_applications_per_judge,
          is_active: judge.is_active
        },
        assignments,
        recent_scores: recentScores,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error fetching judge dashboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/assignments
 * @desc    Get all assigned applications for the judge
 * @access  Private (Judge only)
 */
router.get('/assignments', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, sort = '-assigned_at' } = req.query;
    
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    const query = { judge_id: judge._id };
    
    if (status) {
      query.status = status;
    }

    const assignments = await ApplicationAssignment.find(query)
      .populate({
        path: 'application_id',
        select: 'category business_description workflow_stage submission_date documents sector msme_strata',
        populate: [
          { path: 'user_id', select: 'first_name last_name' }
        ]
      })
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ApplicationAssignment.countDocuments(query);

    // Filter by category if specified
    let filteredAssignments = assignments;
    if (category) {
      filteredAssignments = assignments.filter(assignment => 
        assignment.application_id && assignment.application_id.category === category
      );
    }

    res.json({
      status: 'success',
      data: {
        assignments: filteredAssignments,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching judge assignments:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/assignments/:assignmentId
 * @desc    Get specific assignment details with anonymized application
 * @access  Private (Judge only)
 */
router.get('/assignments/:assignmentId', async (req, res) => {
  try {
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    const assignment = await ApplicationAssignment.findOne({
      _id: req.params.assignmentId,
      judge_id: judge._id
    }).populate({
      path: 'application_id',
      select: 'business_name sector msme_strata location year_established employee_count revenue_band business_description key_achievements products_services_description market_reach jobs_created women_youth_percentage export_activity sustainability_initiatives award_usage_plans pitch_video documents'
    });

    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    // Get anonymized application data based on scoring round
    const anonymizedApplication = assignment.scoring_round === 'first_round' 
      ? assignment.application_id.getAnonymizedData()
      : assignment.application_id.getPartiallyAnonymizedData();

    res.json({
      status: 'success',
      data: {
        assignment: {
          _id: assignment._id,
          status: assignment.status,
          assigned_at: assignment.assigned_at,
          reviewed_at: assignment.reviewed_at,
          conflict_declared: assignment.conflict_declared,
          conflict_reason: assignment.conflict_reason,
          review_notes: assignment.review_notes,
          time_spent_minutes: assignment.time_spent_minutes,
          scoring_round: assignment.scoring_round
        },
        application: anonymizedApplication
      }
    });
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/judge/assignments/:assignmentId/start-review
 * @desc    Start reviewing an assigned application
 * @access  Private (Judge only)
 */
router.post('/assignments/:assignmentId/start-review', async (req, res) => {
  try {
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    const assignment = await ApplicationAssignment.findOne({
      _id: req.params.assignmentId,
      judge_id: judge._id
    });

    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    if (assignment.status !== 'assigned') {
      return res.status(400).json({
        status: 'error',
        message: 'Assignment is not in assigned status'
      });
    }

    await assignment.startReview();

    res.json({
      status: 'success',
      message: 'Review started successfully',
      data: {
        assignment
      }
    });
  } catch (error) {
    console.error('Error starting review:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/assignments/:assignmentId/review
 * @desc    Get application for review (with anonymization based on round)
 * @access  Private (Judge only)
 */
router.get('/assignments/:assignmentId/review', async (req, res) => {
  try {
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    const assignment = await ApplicationAssignment.findOne({
      _id: req.params.assignmentId,
      judge_id: judge._id
    }).populate({
      path: 'application_id',
      select: 'business_name sector msme_strata location year_established employee_count revenue_band business_description key_achievements products_services_description market_reach jobs_created women_youth_percentage export_activity sustainability_initiatives award_usage_plans pitch_video documents'
    });

    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    if (assignment.status === 'assigned') {
      return res.status(400).json({
        status: 'error',
        message: 'Please start the review first before viewing the application'
      });
    }

    // Get anonymized application data based on scoring round
    const anonymizedApplication = assignment.scoring_round === 'first_round' 
      ? assignment.application_id.getAnonymizedData()
      : assignment.application_id.getPartiallyAnonymizedData();

    res.json({
      status: 'success',
      data: {
        assignment: {
          _id: assignment._id,
          status: assignment.status,
          assigned_at: assignment.assigned_at,
          reviewed_at: assignment.reviewed_at,
          conflict_declared: assignment.conflict_declared,
          conflict_reason: assignment.conflict_reason,
          review_notes: assignment.review_notes,
          time_spent_minutes: assignment.time_spent_minutes,
          scoring_round: assignment.scoring_round
        },
        application: anonymizedApplication
      }
    });
  } catch (error) {
    console.error('Error fetching application for review:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/judge/assignments/:assignmentId/declare-conflict
 * @desc    Declare conflict of interest for an assignment
 * @access  Private (Judge only)
 */
router.post('/assignments/:assignmentId/declare-conflict', [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Conflict reason must be between 10 and 500 characters')
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

    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    const assignment = await ApplicationAssignment.findOne({
      _id: req.params.assignmentId,
      judge_id: judge._id
    });

    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    if (assignment.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot declare conflict on completed assignment'
      });
    }

    await assignment.declareConflict(req.body.reason);
    await judge.declareConflict(assignment.application_id, req.body.reason);

    // Send confirmation notification to judge
    await Notification.createJudgeConflictNotification(
      judge._id,
      assignment.application_id,
      req.body.reason,
      'medium'
    );

    res.json({
      status: 'success',
      message: 'Conflict declared successfully',
      data: {
        assignment
      }
    });
  } catch (error) {
    console.error('Error declaring conflict:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/judge/assignments/:assignmentId/score
 * @desc    Submit score for an application
 * @access  Private (Judge only)
 */
router.post('/assignments/:assignmentId/score', [
  body('innovation_differentiation')
    .isInt({ min: 1, max: 20 })
    .withMessage('Innovation and differentiation score must be between 1 and 20'),
  body('market_traction_growth')
    .isInt({ min: 1, max: 20 })
    .withMessage('Market traction and growth score must be between 1 and 20'),
  body('impact_job_creation')
    .isInt({ min: 1, max: 25 })
    .withMessage('Impact and job creation score must be between 1 and 25'),
  body('financial_health_governance')
    .isInt({ min: 1, max: 15 })
    .withMessage('Financial health and governance score must be between 1 and 15'),
  body('inclusion_sustainability')
    .isInt({ min: 1, max: 10 })
    .withMessage('Inclusion and sustainability score must be between 1 and 10'),
  body('scalability_award_use')
    .isInt({ min: 1, max: 10 })
    .withMessage('Scalability and award use score must be between 1 and 10'),
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comments cannot exceed 1000 characters'),
  body('review_notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Review notes cannot exceed 500 characters'),
  body('time_spent_minutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Time spent must be a positive number')
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

    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    const assignment = await ApplicationAssignment.findOne({
      _id: req.params.assignmentId,
      judge_id: judge._id
    });

    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    if (assignment.status !== 'in_review') {
      return res.status(400).json({
        status: 'error',
        message: 'Assignment is not in review status'
      });
    }

    // Check if score already exists
    const existingScore = await Score.findOne({
      application_id: assignment.application_id,
      judge_id: judge._id,
      scoring_round: assignment.scoring_round
    });

    if (existingScore) {
      return res.status(400).json({
        status: 'error',
        message: 'Score already submitted for this application'
      });
    }

    // Create score
    const score = new Score({
      application_id: assignment.application_id,
      judge_id: judge._id,
      scoring_round: assignment.scoring_round,
      ...req.body
    });

    await score.save();

    // Complete assignment
    await assignment.completeReview(
      req.body.review_notes || '',
      req.body.time_spent_minutes
    );

    // Update judge statistics
    await judge.submitScore(assignment.application_id);

    // Send notification to applicant
    const application = await Application.findById(assignment.application_id);
    if (application) {
      await Notification.createApplicationNotification(
        application.user_id,
        'application_reviewed',
        application._id,
        'Application Reviewed',
        `Your application in the ${application.category} category has been reviewed by a judge.`,
        'medium'
      );
    }

    // Send performance update notification to judge (every 5 reviews)
    if (judge.total_scores_submitted % 5 === 0) {
      const performanceData = {
        completion_rate: judge.completion_rate,
        average_score: judge.average_score_given
      };
      
      await Notification.createJudgePerformanceNotification(
        judge._id,
        performanceData,
        'low'
      );
    }

    res.json({
      status: 'success',
      message: 'Score submitted successfully',
      data: {
        score: score.getScoreAnalysis(),
        assignment
      }
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/scores
 * @desc    Get all scores submitted by the judge
 * @access  Private (Judge only)
 */
router.get('/scores', async (req, res) => {
  try {
    const { page = 1, limit = 10, scoring_round } = req.query;
    
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    const query = { judge_id: judge._id };
    if (scoring_round) {
      query.scoring_round = scoring_round;
    }

    const scores = await Score.find(query)
      .populate('application_id', 'category business_description workflow_stage')
      .sort({ scored_at: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Score.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        scores: scores.map(score => ({
          _id: score._id,
          application_category: score.application_id.category,
          total_score: score.total_score,
          score_grade: score.score_grade,
          scored_at: score.scored_at,
          scoring_round: score.scoring_round,
          comments: score.comments
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
    console.error('Error fetching judge scores:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/profile
 * @desc    Get judge profile and statistics
 * @access  Private (Judge only)
 */
router.get('/profile', async (req, res) => {
  try {
    const judge = await Judge.findOne({ user_id: req.user.id })
      .populate('user_id', 'first_name last_name email');

    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    // Get recent judging activity
    const recentActivity = await ApplicationAssignment.find({ judge_id: judge._id })
      .sort({ assigned_at: -1 })
      .limit(10)
      .populate('application_id', 'category workflow_stage');

    res.json({
      status: 'success',
      data: {
        judge_profile: {
          expertise_sectors: judge.expertise_sectors,
          is_active: judge.is_active,
          max_applications_per_judge: judge.max_applications_per_judge,
          assigned_applications_count: judge.assigned_applications_count,
          total_scores_submitted: judge.total_scores_submitted,
          average_score_given: judge.average_score_given,
          completion_rate: judge.completion_rate,
          available_capacity: judge.available_capacity
        },
        user_info: judge.user_id,
        recent_activity: recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching judge profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/performance-metrics
 * @desc    Get advanced performance metrics and analytics
 * @access  Private (Judge only)
 */
router.get('/performance-metrics', async (req, res) => {
  try {
    const judge = await Judge.findOne({ user_id: req.user.id });

    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    // Get advanced performance metrics
    const advancedMetrics = await judge.getAdvancedMetrics();

    // Get comparative metrics (how judge compares to others)
    const Score = mongoose.model('Score');
    const allJudgesScores = await Score.aggregate([
      {
        $group: {
          _id: '$judge_id',
          avg_score: { $avg: '$total_score' },
          total_reviews: { $sum: 1 }
        }
      },
      {
        $match: {
          total_reviews: { $gte: 5 } // Only judges with 5+ reviews
        }
      }
    ]);

    const judgeRanking = allJudgesScores
      .sort((a, b) => b.avg_score - a.avg_score)
      .findIndex(judgeScore => judgeScore._id.toString() === judge._id.toString()) + 1;

    const totalJudges = allJudgesScores.length;
    const percentile = totalJudges > 0 ? Math.round(((totalJudges - judgeRanking + 1) / totalJudges) * 100) : 0;

    res.json({
      status: 'success',
      data: {
        basic_metrics: {
          total_applications_reviewed: judge.total_scores_submitted,
          assigned_applications_count: judge.assigned_applications_count,
          completion_rate: judge.completion_rate,
          available_capacity: judge.available_capacity
        },
        advanced_metrics: advancedMetrics,
        comparative_metrics: {
          ranking: judgeRanking,
          total_judges: totalJudges,
          percentile: percentile,
          performance_level: percentile >= 80 ? 'Excellent' : 
                           percentile >= 60 ? 'Good' : 
                           percentile >= 40 ? 'Average' : 
                           percentile >= 20 ? 'Below Average' : 'Needs Improvement'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/judge/profile
 * @desc    Update judge profile (expertise sectors, max applications)
 * @access  Private (Judge only)
 */
router.put('/profile', [
  body('expertise_sectors')
    .optional()
    .isArray()
    .withMessage('Expertise sectors must be an array'),
  body('expertise_sectors.*')
    .optional()
    .isIn(['fashion', 'it', 'agribusiness', 'food_beverage', 'light_manufacturing', 'creative_enterprise', 'nano_category', 'emerging_enterprise'])
    .withMessage('Invalid expertise sector'),
  body('max_applications_per_judge')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Max applications per judge must be between 1 and 50')
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

    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    // Update judge profile
    if (req.body.expertise_sectors) {
      judge.expertise_sectors = req.body.expertise_sectors;
    }
    if (req.body.max_applications_per_judge) {
      judge.max_applications_per_judge = req.body.max_applications_per_judge;
    }

    await judge.save();

    res.json({
      status: 'success',
      message: 'Judge profile updated successfully',
      data: {
        judge_profile: {
          expertise_sectors: judge.expertise_sectors,
          max_applications_per_judge: judge.max_applications_per_judge,
          available_capacity: judge.available_capacity
        }
      }
    });
  } catch (error) {
    console.error('Error updating judge profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/notifications
 * @desc    Get judge notifications with filtering and pagination
 * @access  Private (Judge only)
 */
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, priority, is_read, type } = req.query;
    
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    // Build query
    const query = { user_id: req.user.id };
    
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (is_read !== undefined) query.is_read = is_read === 'true';
    if (type) query.type = type;

    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Notification.countDocuments(query);

    // Get unread count
    const unreadCount = await Notification.countDocuments({ 
      user_id: req.user.id, 
      is_read: false 
    });

    res.json({
      status: 'success',
      data: {
        notifications: notifications.map(notification => notification.getSummary()),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit)
        },
        unread_count: unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching judge notifications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/judge/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private (Judge only)
 */
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.notificationId,
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
      message: 'Notification marked as read',
      data: {
        notification: notification.getSummary()
      }
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
 * @route   PUT /api/judge/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (Judge only)
 */
router.put('/notifications/read-all', async (req, res) => {
  try {
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        status: 'error',
        message: 'Judge profile not found'
      });
    }

    const result = await Notification.updateMany(
      { user_id: req.user.id, is_read: false },
      { is_read: true, read_at: new Date() }
    );

    res.json({
      status: 'success',
      message: 'All notifications marked as read',
      data: {
        updated_count: result.modifiedCount
      }
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
