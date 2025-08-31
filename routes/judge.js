const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { Judge, Application, ApplicationAssignment, Score, Notification, User, ApplicationLock } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and judge authorization middleware to all routes
router.use(protect);
router.use(authorize('judge'));

/**
 * @route   GET /api/judge/dashboard
 * @desc    Get judge dashboard with statistics
 * @access  Private (Judge only)
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Get active locks (currently reviewing)
    const activeLocks = await ApplicationLock.getJudgeActiveLocks(judge._id);
    
    // Get recent scores
    const recentScores = await Score.find({ judge_id: judge._id })
      .sort({ scored_at: -1 })
      .limit(5)
      .populate('application_id', 'category business_description workflow_stage');

    // Calculate statistics
    const stats = {
      total_reviewing: activeLocks.length,
      completed_reviews: judge.total_scores_submitted || 0,
      average_score: judge.average_score_given || 0,
      available_capacity: judge.available_capacity || 0
    };

    res.json({
      success: true,
      data: {
        judge_profile: {
          expertise_sectors: judge.expertise_sectors,
          max_applications: judge.max_applications_per_judge,
          is_active: judge.is_active
        },
        currently_reviewing: activeLocks.length,
        recent_scores: recentScores,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error fetching judge dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/applications/available
 * @desc    Get all available applications in the pool for review
 * @access  Private (Judge only)
 */
router.get('/applications/available', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      sector, 
      msme_strata, 
      sort = '-submission_date' 
    } = req.query;
    
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Build query for available applications
    const query = {
      workflow_stage: { $in: ['submitted', 'under_review'] } // Available for review
    };
    
    if (category) query.category = category;
    if (sector) query.sector = sector;
    if (msme_strata) query.msme_strata = msme_strata;

    // Get applications with pagination
    const applications = await Application.find(query)
      .populate('user_id', 'first_name last_name')
      .populate('business_profile_id', 'company_name registration_number year_established employee_count annual_revenue')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get lock status for each application
    const applicationsWithLockStatus = await Promise.all(
      applications.map(async (app) => {
        const lockStatus = await ApplicationLock.checkLockStatus(app._id);
        return {
          id: app._id,
          category: app.category,
          title: app.business_description,
          business_description: app.business_description,
          workflow_stage: app.workflow_stage,
          submission_date: app.submission_date,
          sector: app.sector,
          msme_strata: app.msme_strata,
          status: app.status,
          applicant: {
            id: app.user_id._id,
            first_name: app.user_id.first_name,
            last_name: app.user_id.last_name,
            company_name: app.business_profile_id?.company_name || 'N/A'
          },
          lock_status: lockStatus,
          review_stats: {
            total_reviews: 0, // Will be populated with actual data
            average_score: null,
            last_reviewed: null
          }
        };
      })
    );

    const total = await Application.countDocuments(query);

    res.json({
      success: true,
      data: {
        available_applications: applicationsWithLockStatus,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit)
        },
        filters: {
          categories: ['fashion', 'it', 'agribusiness', 'food_beverage', 'light_manufacturing', 'creative_enterprise'],
          sectors: ['fashion', 'technology', 'agriculture', 'food', 'manufacturing', 'creative'],
          msme_strata: ['micro', 'small', 'medium']
        }
      }
    });
  } catch (error) {
    console.error('Error fetching available applications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/applications/reviewing
 * @desc    Get applications currently being reviewed by the judge
 * @access  Private (Judge only)
 */
router.get('/applications/reviewing', async (req, res) => {
  try {
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Get active locks for this judge
    const activeLocks = await ApplicationLock.getJudgeActiveLocks(judge._id);

    const currentlyReviewing = await Promise.all(
      activeLocks.map(async (lock) => {
        const application = await Application.findById(lock.application_id)
          .populate('user_id', 'first_name last_name')
          .populate('business_profile_id', 'company_name');

        return {
          id: application._id,
          category: application.category,
          title: application.business_description,
          lock: {
            id: lock._id,
            expires_at: lock.expires_at,
            time_remaining: lock.time_remaining_minutes,
            lock_type: lock.lock_type
          },
          review_session: {
            started_at: lock.locked_at,
            notes: "Review in progress"
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        currently_reviewing: currentlyReviewing,
        statistics: {
          total_reviewing: currentlyReviewing.length,
          total_locks: currentlyReviewing.length,
          average_time_remaining: currentlyReviewing.length > 0 
            ? Math.round(currentlyReviewing.reduce((sum, app) => sum + app.lock.time_remaining, 0) / currentlyReviewing.length)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching currently reviewing applications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/applications/completed
 * @desc    Get completed reviews by the judge
 * @access  Private (Judge only)
 */
router.get('/applications/completed', async (req, res) => {
  try {
    const { page = 1, limit = 15, date_from, date_to } = req.query;
    
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Build query for completed scores
    const query = { judge_id: judge._id };
    
    if (date_from || date_to) {
      query.scored_at = {};
      if (date_from) query.scored_at.$gte = new Date(date_from);
      if (date_to) query.scored_at.$lte = new Date(date_to);
    }

    const scores = await Score.find(query)
      .populate('application_id', 'category business_description workflow_stage')
      .sort({ scored_at: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Score.countDocuments(query);

    const completedReviews = scores.map(score => ({
      id: score.application_id._id,
      category: score.application_id.category,
      title: score.application_id.business_description,
      score: {
        id: score._id,
        total_score: score.total_score,
        scored_at: score.scored_at
      },
      review_notes: score.comments || "No notes provided",
      recommendations: score.recommendations || "No recommendations"
    }));

    res.json({
      success: true,
      data: {
        completed_reviews: completedReviews,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit)
        },
        statistics: {
          total_completed: total,
          average_score: total > 0 
            ? Math.round(scores.reduce((sum, score) => sum + score.total_score, 0) / total * 100) / 100
            : 0,
          completion_rate: "100%"
        }
      }
    });
  } catch (error) {
    console.error('Error fetching completed reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/judge/applications/:applicationId
 * @desc    Get specific application details for review
 * @access  Private (Judge only)
 */
router.get('/applications/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Get application details
    const application = await Application.findById(applicationId)
      .populate('user_id', 'first_name last_name')
      .populate('business_profile_id', 'company_name registration_number year_established employee_count annual_revenue location');

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check if application is available for review
    if (application.workflow_stage !== 'submitted' && application.workflow_stage !== 'under_review') {
      return res.status(400).json({
        success: false,
        error: 'Application is not available for review'
      });
    }

    // Get lock status
    const lockStatus = await ApplicationLock.checkLockStatus(applicationId);

    // Get previous scores if any
    const previousScores = await Score.find({ application_id: applicationId })
      .populate('judge_id', 'user_id')
      .populate('judge_id.user_id', 'first_name last_name')
      .sort({ scored_at: -1 });

    res.json({
      success: true,
      data: {
        application: {
          id: application._id,
          category: application.category,
          title: application.business_description,
          business_description: application.business_description,
          workflow_stage: application.workflow_stage,
          submission_date: application.submission_date,
          sector: application.sector,
          msme_strata: application.msme_strata,
          status: application.status,
          documents: application.documents || [],
          business_profile: application.business_profile_id ? {
            company_name: application.business_profile_id.company_name,
            registration_number: application.business_profile_id.registration_number,
            year_established: application.business_profile_id.year_established,
            employee_count: application.business_profile_id.employee_count,
            annual_revenue: application.business_profile_id.annual_revenue,
            location: application.business_profile_id.location
          } : null
        },
        lock_status: lockStatus,
        previous_scores: previousScores.map(score => ({
          id: score._id,
          total_score: score.total_score,
          scored_at: score.scored_at,
          judge_name: `${score.judge_id.user_id.first_name} ${score.judge_id.user_id.last_name}`
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/judge/applications/:applicationId/review/start
 * @desc    Start reviewing an application (acquire lock)
 * @access  Private (Judge only)
 */
router.post('/applications/:applicationId/review/start', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { lock_duration = 60, review_notes = "", expertise_match, estimated_review_time } = req.body;

    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Check if application exists and is available
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    if (application.workflow_stage !== 'submitted' && application.workflow_stage !== 'under_review') {
      return res.status(400).json({
        success: false,
        error: 'Application is not available for review'
      });
    }

    // Try to acquire lock
    const lockResult = await ApplicationLock.acquireLock(
      applicationId,
      judge._id,
      req.user.id,
      'review',
      crypto.randomBytes(16).toString('hex'),
      lock_duration
    );

    if (!lockResult.success) {
      return res.status(423).json({ // 423 Locked
        success: false,
        error: lockResult.error,
        lock_info: {
          locked_by: lockResult.locked_by,
          expires_at: lockResult.expires_at,
          time_remaining: lockResult.time_remaining
        }
      });
    }

    // Update application status to under_review
    application.workflow_stage = 'under_review';
    await application.save();

    res.json({
      success: true,
      message: 'Review started successfully',
      data: {
        lock: {
          id: lockResult.lock._id,
          expires_at: lockResult.expires_at,
          time_remaining: lockResult.lock.time_remaining_minutes,
          lock_type: lockResult.lock.lock_type
        },
        review_session: {
          id: crypto.randomBytes(16).toString('hex'),
          started_at: new Date(),
          notes: review_notes,
          expertise_match: expertise_match || 'general',
          estimated_review_time: estimated_review_time || 60
        },
        application: {
          id: application._id,
          title: application.business_description,
          category: application.category,
          status: application.workflow_stage
        }
      }
    });
  } catch (error) {
    console.error('Error starting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start review'
    });
  }
});

/**
 * @route   POST /api/judge/applications/:applicationId/score
 * @desc    Submit application score
 * @access  Private (Judge only)
 */
router.post('/applications/:applicationId/score', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { 
      criteria_scores, 
      overall_score, 
      comments, 
      recommendations, 
      review_notes 
    } = req.body;

    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Check if judge has an active lock on this application
    const lock = await ApplicationLock.findOne({
      application_id: applicationId,
      judge_id: judge._id,
      is_active: true
    });

    if (!lock) {
      return res.status(400).json({
        success: false,
        error: 'You must have an active lock to submit a score'
      });
    }

    if (lock.isExpired()) {
      await lock.releaseLock();
      return res.status(410).json({
        success: false,
        error: 'Your review session has expired. Please start a new review.'
      });
    }

    // Create or update score
    let score = await Score.findOne({
      application_id: applicationId,
      judge_id: judge._id
    });

    if (score) {
      // Update existing score
      score.criteria_scores = criteria_scores;
      score.total_score = overall_score;
      score.comments = comments;
      score.recommendations = recommendations;
      score.review_notes = review_notes;
      score.updated_at = new Date();
      await score.save();
    } else {
      // Create new score
      score = await Score.create({
        application_id: applicationId,
        judge_id: judge._id,
        criteria_scores,
        total_score: overall_score,
        comments,
        recommendations,
        review_notes,
        scored_at: new Date()
      });
    }

    // Release the lock
    await ApplicationLock.releaseLock(applicationId, judge._id);

    // Update application status
    const application = await Application.findById(applicationId);
    if (application) {
      application.workflow_stage = 'reviewed';
      await application.save();
    }

    res.json({
      success: true,
      message: 'Score submitted successfully',
      data: {
        score: {
          id: score._id,
          total_score: score.total_score,
          criteria_scores: score.criteria_scores,
          comments: score.comments,
          recommendations: score.recommendations,
          scored_at: score.scored_at
        },
        lock_released: true
      }
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit score'
    });
  }
});

/**
 * @route   GET /api/judge/applications/pool-stats
 * @desc    Get application pool statistics
 * @access  Private (Judge only)
 */
router.get('/applications/pool-stats', async (req, res) => {
  try {
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Get pool statistics - Use workflow_stage instead of status
    const totalApplications = await Application.countDocuments({ 
      workflow_stage: { $in: ['submitted', 'under_review', 'pre_screening'] }
    });
    const availableApplications = await Application.countDocuments({ 
      workflow_stage: { $in: ['submitted', 'under_review'] }
    });
    const currentlyReviewing = await ApplicationLock.countDocuments({ is_active: true });
    const completedReviews = await Score.countDocuments();

    // Get category distribution
    const categoryDistribution = await Application.aggregate([
      { $match: { workflow_stage: { $in: ['submitted', 'under_review', 'pre_screening'] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        pool_overview: {
          total_applications: totalApplications,
          available_for_review: availableApplications,
          currently_reviewing: currentlyReviewing,
          completed_reviews: completedReviews
        },
        category_distribution: categoryDistribution.map(cat => ({
          category: cat._id,
          total: cat.count,
          available: cat.count, // Simplified for now
          reviewing: 0,
          completed: 0
        })),
        review_progress: {
          total_reviews_needed: totalApplications,
          completed_reviews: completedReviews,
          in_progress: currentlyReviewing,
          completion_percentage: totalApplications > 0 
            ? Math.round((completedReviews / totalApplications) * 100)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pool statistics:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// APPLICATION LOCKING SYSTEM ENDPOINTS
// ========================================

/**
 * @route   POST /api/judge/applications/:applicationId/lock
 * @desc    Acquire lock on application for review
 * @access  Private (Judge only)
 */
router.post('/applications/:applicationId/lock', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { lock_type = 'review', lock_duration = 60 } = req.body;

    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Try to acquire lock
    const lockResult = await ApplicationLock.acquireLock(
      applicationId,
      judge._id,
      req.user.id,
      lock_type,
      crypto.randomBytes(16).toString('hex'),
      lock_duration
    );

    if (!lockResult.success) {
      return res.status(423).json({ // 423 Locked
        success: false,
        error: lockResult.error,
        lock_info: {
          locked_by: lockResult.locked_by,
          expires_at: lockResult.expires_at,
          time_remaining: lockResult.time_remaining
        }
      });
    }

    res.json({
      success: true,
      message: 'Application locked successfully for review',
      data: {
        lock: {
          id: lockResult.lock._id,
          expires_at: lockResult.expires_at,
          time_remaining: lockResult.lock.time_remaining_minutes,
          lock_type: lockResult.lock.lock_type
        }
      }
    });
  } catch (error) {
    console.error('Error acquiring application lock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acquire application lock'
    });
  }
});

/**
 * @route   PUT /api/judge/applications/:applicationId/lock/extend
 * @desc    Extend application lock duration
 * @access  Private (Judge only)
 */
router.put('/applications/:applicationId/lock/extend', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { extend_by = 30 } = req.body;

    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Check if judge has an active lock on this application
    const lock = await ApplicationLock.findOne({
      application_id: applicationId,
      judge_id: judge._id,
      is_active: true
    });

    if (!lock) {
      return res.status(404).json({
        success: false,
        error: 'No active lock found for this application'
      });
    }

    if (lock.isExpired()) {
      await lock.releaseLock();
      return res.status(410).json({
        success: false,
        error: 'Application lock has expired. Please acquire a new lock.'
      });
    }

    // Extend lock
    await lock.extendLock(extend_by);

    res.json({
      success: true,
      message: `Application lock extended by ${extend_by} minutes`,
      data: {
        lock: {
          id: lock._id,
          expires_at: lock.expires_at,
          time_remaining: lock.time_remaining_minutes,
          lock_type: lock.lock_type
        }
      }
    });
  } catch (error) {
    console.error('Error extending application lock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extend application lock'
    });
  }
});

/**
 * @route   DELETE /api/judge/applications/:applicationId/lock
 * @desc    Release lock on application
 * @access  Private (Judge only)
 */
router.delete('/applications/:applicationId/lock', async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Release lock
    const releaseResult = await ApplicationLock.releaseLock(applicationId, judge._id);

    if (!releaseResult.success) {
      return res.status(404).json({
        success: false,
        error: releaseResult.error || 'Lock not found'
      });
    }

    res.json({
      success: true,
      message: 'Application lock released successfully'
    });
  } catch (error) {
    console.error('Error releasing application lock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release application lock'
    });
  }
});

/**
 * @route   GET /api/judge/applications/:applicationId/lock/status
 * @desc    Check lock status of application
 * @access  Private (Judge only)
 */
router.get('/applications/:applicationId/lock/status', async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Check lock status
    const lockStatus = await ApplicationLock.checkLockStatus(applicationId);

    res.json({
      success: true,
      data: {
        lock_status: lockStatus,
        judge_has_lock: lockStatus.is_locked && lockStatus.judge_id.toString() === judge._id.toString()
      }
    });
  } catch (error) {
    console.error('Error checking lock status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check lock status'
    });
  }
});

/**
 * @route   GET /api/judge/locks/active
 * @desc    Get all active locks for the current judge
 * @access  Private (Judge only)
 */
router.get('/locks/active', async (req, res) => {
  try {
    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Get active locks
    const activeLocks = await ApplicationLock.getJudgeActiveLocks(judge._id);

    res.json({
      success: true,
      data: {
        active_locks: activeLocks.map(lock => ({
          id: lock._id,
          application_id: lock.application_id._id,
          application_category: lock.application_id.category,
          application_title: lock.application_id.title,
          lock_type: lock.lock_type,
          locked_at: lock.locked_at,
          expires_at: lock.expires_at,
          time_remaining: lock.time_remaining_minutes,
          last_activity: lock.last_activity
        }))
      }
    });
  } catch (error) {
    console.error('Error getting active locks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active locks'
    });
  }
});

module.exports = router;
