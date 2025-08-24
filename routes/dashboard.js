const express = require('express');
const { Application, BusinessProfile, Judge, Score, ApplicationTimeline, SystemSetting } = require('../models');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/dashboard/overview
 * @desc    Get public overview statistics
 * @access  Public
 */
router.get('/overview', async (req, res) => {
  try {
    // Get basic statistics
    const totalApplications = await Application.countDocuments();
    const submittedApplications = await Application.countDocuments({ status: 'submitted' });
    const underReviewApplications = await Application.countDocuments({ status: 'under_review' });
    const shortlistedApplications = await Application.countDocuments({ status: 'shortlisted' });

    // Get applications by category
    const applicationsByCategory = await Application.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get current phase
    const currentPhase = await ApplicationTimeline.getCurrentPhase();

    // Get system settings
    const systemName = await SystemSetting.getByKey('system_name');
    const maintenanceMode = await SystemSetting.getByKey('maintenance_mode');

    res.json({
      status: 'success',
      data: {
        system_info: {
          name: systemName ? systemName.value : 'nMSME Awards Portal',
          maintenance_mode: maintenanceMode ? maintenanceMode.typed_value : false
        },
        statistics: {
          total_applications: totalApplications,
          submitted_applications: submittedApplications,
          under_review_applications: underReviewApplications,
          shortlisted_applications: shortlistedApplications
        },
        applications_by_category: applicationsByCategory,
        current_phase: currentPhase ? {
          phase: currentPhase.phase,
          status: currentPhase.status,
          days_remaining: currentPhase.days_remaining,
          description: currentPhase.description
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/dashboard/user-stats
 * @desc    Get user-specific statistics (requires authentication)
 * @access  Private
 */
router.get('/user-stats', protect, async (req, res) => {
  try {
    // Get user's applications
    const userApplications = await Application.find({ user_id: req.user.id });
    const totalApplications = userApplications.length;
    const submittedApplications = userApplications.filter(app => app.status === 'submitted').length;
    const underReviewApplications = userApplications.filter(app => app.status === 'under_review').length;
    const shortlistedApplications = userApplications.filter(app => app.status === 'shortlisted').length;

    // Get user's business profile
    const businessProfile = await BusinessProfile.findOne({ user_id: req.user.id });

    // Get user's notifications
    const unreadNotifications = await require('../models').Notification.countDocuments({
      user_id: req.user.id,
      is_read: false
    });

    // Get applications by category for this user
    const applicationsByCategory = userApplications.reduce((acc, app) => {
      acc[app.category] = (acc[app.category] || 0) + 1;
      return acc;
    }, {});

    res.json({
      status: 'success',
      data: {
        applications: {
          total: totalApplications,
          submitted: submittedApplications,
          under_review: underReviewApplications,
          shortlisted: shortlistedApplications,
          by_category: applicationsByCategory
        },
        business_profile: businessProfile ? {
          business_name: businessProfile.business_name,
          sector: businessProfile.sector,
          msme_category: businessProfile.msme_category,
          state: businessProfile.state
        } : null,
        notifications: {
          unread_count: unreadNotifications
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/dashboard/judge-stats
 * @desc    Get judge-specific statistics (requires judge authentication)
 * @access  Private (Judge only)
 */
router.get('/judge-stats', protect, async (req, res) => {
  try {
    // Check if user is a judge
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Judge privileges required.'
      });
    }

    // Get judge's assignments
    const assignments = await require('../models').ApplicationAssignment.find({ judge_id: judge._id });
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(assignment => assignment.status === 'completed').length;
    const pendingAssignments = assignments.filter(assignment => assignment.status === 'assigned').length;

    // Get judge's scores
    const scores = await Score.find({ judge_id: judge._id });
    const totalScores = scores.length;
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score.total_score, 0) / scores.length : 0;

    // Get scores by category
    const scoresByCategory = await Score.aggregate([
      { $match: { judge_id: judge._id } },
      { $lookup: {
        from: 'applications',
        localField: 'application_id',
        foreignField: '_id',
        as: 'application'
      }},
      { $unwind: '$application' },
      { $group: {
        _id: '$application.category',
        count: { $sum: 1 },
        avg_score: { $avg: '$total_score' }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({
      status: 'success',
      data: {
        assignments: {
          total: totalAssignments,
          completed: completedAssignments,
          pending: pendingAssignments,
          completion_rate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0
        },
        scores: {
          total: totalScores,
          average: Math.round(averageScore * 100) / 100,
          by_category: scoresByCategory
        },
        judge_profile: {
          expertise_sectors: judge.expertise_sectors,
          max_applications: judge.max_applications_per_judge,
          available_capacity: judge.available_capacity,
          is_active: judge.is_active
        }
      }
    });
  } catch (error) {
    console.error('Error fetching judge statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/dashboard/admin-stats
 * @desc    Get admin-specific statistics (requires admin authentication)
 * @access  Private (Admin only)
 */
router.get('/admin-stats', protect, async (req, res) => {
  try {
    // Check if user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Get comprehensive statistics
    const totalUsers = await require('../models').User.countDocuments({ role: 'applicant' });
    const totalApplications = await Application.countDocuments();
    const totalJudges = await Judge.countDocuments({ is_active: true });
    const submittedApplications = await Application.countDocuments({ status: 'submitted' });
    const underReviewApplications = await Application.countDocuments({ status: 'under_review' });
    const shortlistedApplications = await Application.countDocuments({ status: 'shortlisted' });

    // Get applications by category and status
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

    // Get judge performance
    const judgePerformance = await Judge.aggregate([
      { $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $project: {
        judge_name: { $concat: ['$user.first_name', ' ', '$user.last_name'] },
        assigned_count: '$assigned_applications_count',
        completed_count: '$total_scores_submitted',
        completion_rate: { 
          $cond: [
            { $eq: ['$assigned_applications_count', 0] },
            0,
            { $multiply: [{ $divide: ['$total_scores_submitted', '$assigned_applications_count'] }, 100] }
          ]
        },
        avg_score: '$average_score_given'
      }},
      { $sort: { completion_rate: -1 } }
    ]);

    // Get recent activities
    const recentApplications = await Application.find()
      .sort({ created_at: -1 })
      .limit(5)
      .populate('user_id', 'first_name last_name')


    const recentScores = await Score.find()
      .sort({ scored_at: -1 })
      .limit(5)
      .populate('judge_id', 'user_id')
      .populate('judge_id.user_id', 'first_name last_name')
      .populate('application_id', 'category');

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
        applications_by_category_status: applicationsByCategoryStatus,
        judge_performance: judgePerformance,
        recent_activities: {
          applications: recentApplications,
          scores: recentScores
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/dashboard/timeline
 * @desc    Get application timeline information
 * @access  Public
 */
router.get('/timeline', async (req, res) => {
  try {
    const phases = await ApplicationTimeline.getAllPhases();
    
    const timelineData = phases.map(phase => ({
      phase: phase.phase,
      status: phase.status,
      start_date: phase.start_date,
      end_date: phase.end_date,
      days_remaining: phase.days_remaining,
      days_elapsed: phase.days_elapsed,
      progress_percentage: phase.progress_percentage,
      is_active: phase.is_active,
      description: phase.description
    }));

    res.json({
      status: 'success',
      data: {
        timeline: timelineData
      }
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/dashboard/categories
 * @desc    Get application categories with statistics
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      'fashion', 'it', 'agribusiness', 'food_beverage', 
      'light_manufacturing', 'creative_enterprise', 'nano_category', 'emerging_enterprise'
    ];

    const categoryStats = await Application.aggregate([
      { $group: {
        _id: '$category',
        total: { $sum: 1 },
        submitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
        under_review: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
        shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] } },
        finalist: { $sum: { $cond: [{ $eq: ['$status', 'finalist'] }, 1, 0] } },
        winner: { $sum: { $cond: [{ $eq: ['$status', 'winner'] }, 1, 0] } }
      }},
      { $sort: { total: -1 } }
    ]);

    // Fill in missing categories with zero counts
    const completeStats = categories.map(category => {
      const existing = categoryStats.find(stat => stat._id === category);
      return existing || {
        _id: category,
        total: 0,
        submitted: 0,
        under_review: 0,
        shortlisted: 0,
        finalist: 0,
        winner: 0
      };
    });

    res.json({
      status: 'success',
      data: {
        categories: completeStats
      }
    });
  } catch (error) {
    console.error('Error fetching category statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
