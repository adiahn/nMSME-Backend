const express = require('express');
const { Application, Judge, ApplicationAssignment, Score, ApplicationLock } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and judge authorization middleware to all routes
router.use(protect);
router.use(authorize('judge'));

/**
 * @route   GET /api/judge/applications/equal-distribution
 * @desc    Get applications with equal distribution among judges
 * @access  Private (Judge only)
 */
router.get('/applications/equal-distribution', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'available'
    } = req.query;
    
    const judge = await Judge.findOne({ user_id: req.user.id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        error: 'Judge profile not found'
      });
    }

    // Get all active judges
    const allJudges = await Judge.find({ is_active: true }).sort('createdAt');
    const judgeIndex = allJudges.findIndex(j => j._id.equals(judge._id));
    
    if (judgeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Judge not found in active judges list'
      });
    }

    // Get all applications
    let query = { workflow_stage: { $in: ['submitted', 'under_review'] } };
    if (status === 'reviewing') {
      // Applications currently being reviewed by this judge
      const reviewingAssignments = await ApplicationAssignment.find({ 
        judge_id: judge._id, 
        status: 'in_progress' 
      });
      query._id = { $in: reviewingAssignments.map(a => a.application_id) };
    } else if (status === 'completed') {
      // Applications completed by this judge
      const completedAssignments = await ApplicationAssignment.find({ 
        judge_id: judge._id, 
        status: 'completed' 
      });
      query._id = { $in: completedAssignments.map(a => a.application_id) };
    }

    const allApplications = await Application.find(query)
      .populate('user_id', 'first_name last_name')
      .sort('createdAt'); // Sort by creation date for consistent distribution

    // Calculate equal distribution
    const totalApplications = allApplications.length;
    const totalJudges = allJudges.length;
    const applicationsPerJudge = Math.floor(totalApplications / totalJudges);
    const extraApplications = totalApplications % totalJudges;

    // Calculate this judge's range
    const startIndex = judgeIndex * applicationsPerJudge + Math.min(judgeIndex, extraApplications);
    const endIndex = startIndex + applicationsPerJudge + (judgeIndex < extraApplications ? 1 : 0);

    // Get this judge's applications
    const judgeApplications = allApplications.slice(startIndex, endIndex);

    // Apply pagination to judge's applications
    const paginatedApplications = judgeApplications.slice(
      (parseInt(page) - 1) * parseInt(limit),
      parseInt(page) * parseInt(limit)
    );

    // Get additional data for each application
    const applicationsWithDetails = await Promise.all(
      paginatedApplications.map(async (app) => {
        // Get lock status
        const lockStatus = await ApplicationLock.checkLockStatus(app._id);
        
        // Get assignment status for this judge
        const assignment = await ApplicationAssignment.findOne({
          application_id: app._id,
          judge_id: judge._id
        });
        
        // Get review stats
        const scores = await Score.find({ application_id: app._id });
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score.total_score, 0) / scores.length 
          : null;

        return {
          id: app._id,
          category: app.category,
          business_name: app.business_name,
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
            company_name: app.business_name || 'N/A'
          },
          lock_status: lockStatus,
          assignment_status: assignment?.status || 'not_assigned',
          review_stats: {
            total_reviews: scores.length,
            average_score: averageScore,
            last_reviewed: scores.length > 0 ? Math.max(...scores.map(s => new Date(s.scored_at))) : null
          },
          // Add expertise match indicator
          expertise_match: judge.expertise_sectors.some(sector => {
            const expertiseToSectorMap = {
              'fashion': 'Fashion',
              'it': 'Information Technology (IT)',
              'agribusiness': 'Agribusiness',
              'food_beverage': 'Food & Beverage',
              'light_manufacturing': 'Light Manufacturing',
              'creative_enterprise': 'Creative Enterprise',
              'nano_category': 'Emerging Enterprise Award',
              'emerging_enterprise': 'Emerging Enterprise Award'
            };
            return expertiseToSectorMap[sector] === app.sector;
          })
        };
      })
    );

    // Get summary counts
    const availableCount = await Application.countDocuments({ 
      workflow_stage: { $in: ['submitted', 'under_review'] }
    });
    
    const reviewingCount = await ApplicationAssignment.countDocuments({ 
      judge_id: judge._id, 
      status: 'in_progress' 
    });
    
    const completedCount = await ApplicationAssignment.countDocuments({ 
      judge_id: judge._id, 
      status: 'completed' 
    });

    // Calculate distribution info
    const totalPages = Math.ceil(judgeApplications.length / parseInt(limit));
    const expertiseMatches = applicationsWithDetails.filter(app => app.expertise_match).length;
    const overflowApplications = applicationsWithDetails.filter(app => !app.expertise_match).length;

    res.json({
      success: true,
      data: {
        applications: applicationsWithDetails,
        summary: {
          total_applications: judgeApplications.length,
          available: availableCount,
          reviewing: reviewingCount,
          completed: completedCount,
          expertise_matches: expertiseMatches,
          overflow_applications: overflowApplications
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: judgeApplications.length,
          items_per_page: parseInt(limit)
        },
        distribution_info: {
          judge_index: judgeIndex + 1,
          total_judges: totalJudges,
          applications_per_judge: applicationsPerJudge,
          extra_applications: extraApplications,
          judge_range: `${startIndex + 1}-${endIndex}`,
          distribution_method: 'equal_workload'
        },
        filters: {
          statuses: ['available', 'reviewing', 'completed']
        }
      }
    });
  } catch (error) {
    console.error('Error fetching equal distribution applications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
