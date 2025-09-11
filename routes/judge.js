const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { Judge, Application, ApplicationAssignment, Score, Notification, User, ApplicationLock } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { fixApplicationDocumentUrls } = require('../utils/cloudinaryHelper');
const equalDistributionRoutes = require('./equal-distribution');

const router = express.Router();

// Apply authentication and judge authorization middleware to all routes
router.use(protect);
router.use(authorize('judge'));

// Include equal distribution routes
router.use('/', equalDistributionRoutes);

/**
 * @route   GET /api/judge/applications/random-distribution
 * @desc    Get applications with random distribution (alias for main applications endpoint)
 * @access  Private (Judge only)
 */
router.get('/applications/random-distribution', async (req, res) => {
  // Redirect to main applications endpoint which already uses random distribution
  req.url = '/applications';
  return router.handle(req, res);
});

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
 * @route   GET /api/judge/applications
 * @desc    Get applications with equal distribution among judges
 * @access  Private (Judge only)
 */
router.get('/applications', async (req, res) => {
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

    // Calculate random distribution
    const totalApplications = allApplications.length;
    const totalJudges = allJudges.length;
    const applicationsPerJudge = Math.floor(totalApplications / totalJudges);
    const extraApplications = totalApplications % totalJudges;

    // Create a deterministic random distribution based on judge ID
    // This ensures the same judge always gets the same applications
    const judgeSeed = judge._id.toString().slice(-8); // Use last 8 chars of judge ID as seed
    const seed = parseInt(judgeSeed, 16) % 1000000; // Convert to number for seeding
    
    // Shuffle applications using a seeded random function
    const shuffledApplications = [...allApplications];
    for (let i = shuffledApplications.length - 1; i > 0; i--) {
      const j = (seed + i * 7) % (i + 1); // Pseudo-random with seed
      [shuffledApplications[i], shuffledApplications[j]] = [shuffledApplications[j], shuffledApplications[i]];
    }

    // Calculate this judge's range in the shuffled array
    const startIndex = judgeIndex * applicationsPerJudge + Math.min(judgeIndex, extraApplications);
    const endIndex = startIndex + applicationsPerJudge + (judgeIndex < extraApplications ? 1 : 0);

    // Get this judge's applications from shuffled array
    const judgeApplications = shuffledApplications.slice(startIndex, endIndex);

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

        // Check if this application matches judge's expertise
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
        
        const judgeSectors = judge.expertise_sectors.map(sector => expertiseToSectorMap[sector]).filter(Boolean);
        const expertiseMatch = judgeSectors.includes(app.sector);

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
          expertise_match: expertiseMatch
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
          distribution_method: 'random_equal_workload',
          judge_seed: judgeSeed
        },
        filters: {
          statuses: ['available', 'reviewing', 'completed']
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

    // Map judge expertise sectors to application sectors
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

    // Get sectors that match judge's expertise
    const judgeSectors = judge.expertise_sectors.map(sector => expertiseToSectorMap[sector]).filter(Boolean);
    
    console.log(`Available applications - Judge expertise: ${judge.expertise_sectors.join(', ')}`);
    console.log(`Mapped to application sectors: ${judgeSectors.join(', ')}`);

    // Build query for available applications in judge's expertise sectors
    const query = {
      workflow_stage: { $in: ['submitted', 'under_review'] }, // Available for review
      sector: { $in: judgeSectors } // Only show applications in judge's expertise sectors
    };
    
    // Only override sector filter if a specific sector is requested
    if (sector) {
      // If specific sector requested, check if it's in judge's expertise
      if (judgeSectors.includes(sector)) {
        query.sector = sector;
      } else {
        // Return empty result if requested sector is not in judge's expertise
        return res.json({
          success: true,
          data: {
            available_applications: [],
            pagination: {
              current_page: parseInt(page),
              total_pages: 0,
              total_items: 0,
              items_per_page: parseInt(limit)
            },
            filters: {
              sectors: judgeSectors,
              categories: ['Fashion', 'Information Technology (IT)', 'Agribusiness', 'Food & Beverage', 'Light Manufacturing', 'Creative Enterprise', 'Emerging Enterprise Award'],
              msme_strata: ['micro', 'small', 'medium']
            }
          }
        });
      }
    }
    if (msme_strata) query.msme_strata = msme_strata;

    // Get applications with pagination
    const applications = await Application.find(query)
      .populate('user_id', 'first_name last_name')
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
            company_name: app.business_name || 'N/A'
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
          sectors: judgeSectors, // Only show sectors the judge can access
          categories: ['Fashion', 'Information Technology (IT)', 'Agribusiness', 'Food & Beverage', 'Light Manufacturing', 'Creative Enterprise', 'Emerging Enterprise Award'],
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

    // Map judge's expertise to sectors
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
    const judgeSectors = judge.expertise_sectors.map(sector => expertiseToSectorMap[sector]).filter(Boolean);

    // Get application details
    const application = await Application.findById(applicationId)
      .populate('user_id', 'first_name last_name email phone');

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // With random distribution, judges can review any application assigned to them
    // No need to check expertise sectors - all assigned applications are reviewable

    // Check if application is available for review
    if (application.workflow_stage !== 'submitted' && application.workflow_stage !== 'under_review') {
      return res.status(400).json({
        success: false,
        error: 'Application is not available for review'
      });
    }

    // Get lock status
    const lockStatus = await ApplicationLock.checkLockStatus(applicationId);
    
    // Add locked_by_current_user field for frontend
    const isLockedByCurrentUser = lockStatus.is_locked && 
      lockStatus.locked_by && 
      lockStatus.locked_by === judge._id.toString();
    
    const enhancedLockStatus = {
      ...lockStatus,
      locked_by_current_user: isLockedByCurrentUser
    };

    // Get previous scores if any
    const previousScores = await Score.find({ application_id: applicationId })
      .populate('judge_id', 'user_id')
      .populate('judge_id.user_id', 'first_name last_name')
      .sort({ scored_at: -1 });

    // Fix document URLs to use correct Cloudinary resource types
    const applicationWithFixedUrls = fixApplicationDocumentUrls(application);

    res.json({
      success: true,
      data: {
        application: {
          // Basic Information
          id: application._id,
          category: application.category,
          sector: application.sector,
          msme_strata: application.msme_strata,
          workflow_stage: application.workflow_stage,
          status: application.status || 'active',
          submission_date: application.submission_date,
          created_at: application.createdAt,
          updated_at: application.updatedAt,
          
          // Business Information
          business_name: application.business_name,
          business_description: application.business_description,
          business_registration_status: application.business_registration_status,
          cac_number: application.cac_number,
          business_type: application.business_type,
          year_established: application.year_established,
          employee_count: application.employee_count,
          revenue_band: application.revenue_band,
          
          // Location Information
          location: {
            state: application.location?.state,
            lga: application.location?.lga
          },
          
          // Contact Information
          website: application.website,
          social_media: application.social_media || {},
          
          // Application Content
          key_achievements: application.key_achievements,
          products_services_description: application.products_services_description,
          
          // Impact Metrics
          jobs_created: application.jobs_created,
          women_youth_percentage: application.women_youth_percentage,
          export_activity: {
            has_exports: application.export_activity?.has_exports,
            export_details: application.export_activity?.export_details
          },
          sustainability_initiatives: {
            has_initiatives: application.sustainability_initiatives?.has_initiatives,
            initiative_details: application.sustainability_initiatives?.initiative_details
          },
          award_usage_plans: application.award_usage_plans,
          
          // Legacy Fields (if they exist)
          owner_position: application.owner_position,
          alternate_phone: application.alternate_phone,
          why_deserve_award: application.why_deserve_award,
          achievements: application.achievements || [],
          challenges: application.challenges || [],
          future_goals: application.future_goals || [],
          target_market: application.target_market,
          
          // Media & Documents
          pitch_video: {
            url: application.pitch_video?.url,
            youtube_vimeo_url: application.pitch_video?.youtube_vimeo_url,
            video_id: application.pitch_video?.video_id,
            platform: application.pitch_video?.platform,
            is_youtube_link: application.pitch_video?.is_youtube_link
          },
          documents: applicationWithFixedUrls.documents || [],
          
          // Scoring Information
          scores: application.scores || [],
          total_score: application.total_score || 0,
          average_score: application.average_score || 0,
          
          // Pre-screening Information
          pre_screening: {
            passed: application.pre_screening?.passed || false,
            checked_by: application.pre_screening?.checked_by,
            checked_at: application.pre_screening?.checked_at,
            notes: application.pre_screening?.notes,
            issues: application.pre_screening?.issues || []
          },
          
          // Timeline Information
          review_start_date: application.review_start_date,
          review_completion_date: application.review_completion_date,
          shortlist_date: application.shortlist_date,
          winner_announcement_date: application.winner_announcement_date,
          
          // Applicant Information
          applicant: {
            id: application.user_id._id,
            first_name: application.user_id.first_name,
            last_name: application.user_id.last_name,
            email: application.user_id.email,
            phone: application.user_id.phone
          },
          
          // Application Metadata
          application_age: application.application_age || 0,
          is_complete: application.isComplete ? application.isComplete() : false,
          required_documents_status: application.validateRequiredDocuments ? application.validateRequiredDocuments() : {}
        },
        
        // Lock and Review Information
        lock_status: enhancedLockStatus,
        review_info: {
          can_review: !enhancedLockStatus.is_locked || enhancedLockStatus.locked_by === judge._id.toString(),
          is_locked: enhancedLockStatus.is_locked,
          locked_by: enhancedLockStatus.locked_by,
          lock_expires_at: enhancedLockStatus.lock_expires_at
        },
        
        // Previous Scores from Other Judges
        previous_scores: previousScores.map(score => ({
          id: score._id,
          total_score: score.total_score,
          criteria_scores: {
            innovation_differentiation: score.innovation_differentiation,
            market_traction_growth: score.market_traction_growth,
            impact_job_creation: score.impact_job_creation,
            financial_health_governance: score.financial_health_governance,
            inclusion_sustainability: score.inclusion_sustainability,
            scalability_award_use: score.scalability_award_use
          },
          comments: score.comments,
          recommendations: score.recommendations,
          review_notes: score.review_notes,
          scored_at: score.scored_at,
          judge_name: `${score.judge_id.user_id.first_name} ${score.judge_id.user_id.last_name}`
        })),
        
        // Judge Authorization
        judge_authorization: {
          can_view: true,
          can_review: !lockStatus.is_locked || lockStatus.locked_by === judge._id.toString(),
          expertise_match: judgeSectors.includes(application.sector),
          judge_sectors: judgeSectors,
          distribution_method: 'random_equal_workload',
          note: 'With random distribution, judges can review any assigned application regardless of expertise match'
        }
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

    // No lock requirement - judges can submit scores directly
    // Check if application exists and is available for review
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

    // Create or update score
    let score = await Score.findOne({
      application_id: applicationId,
      judge_id: judge._id
    });

    if (score) {
      // Update existing score
      score.business_viability_financial_health = criteria_scores.business_viability_financial_health;
      score.market_opportunity_traction = criteria_scores.market_opportunity_traction;
      score.social_impact_job_creation = criteria_scores.social_impact_job_creation;
      score.innovation_technology_adoption = criteria_scores.innovation_technology_adoption;
      score.sustainability_environmental_impact = criteria_scores.sustainability_environmental_impact;
      score.management_leadership = criteria_scores.management_leadership;
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
        business_viability_financial_health: criteria_scores.business_viability_financial_health,
        market_opportunity_traction: criteria_scores.market_opportunity_traction,
        social_impact_job_creation: criteria_scores.social_impact_job_creation,
        innovation_technology_adoption: criteria_scores.innovation_technology_adoption,
        sustainability_environmental_impact: criteria_scores.sustainability_environmental_impact,
        management_leadership: criteria_scores.management_leadership,
        total_score: overall_score,
        comments,
        recommendations,
        review_notes,
        scored_at: new Date()
      });
    }

    // Update application status to under_review (not reviewed since that's not a valid enum)
    application.workflow_stage = 'under_review';
    await application.save();

    res.json({
      success: true,
      message: 'Score submitted successfully',
      data: {
        score: {
          id: score._id,
          total_score: score.total_score,
          criteria_scores: {
            business_viability_financial_health: score.business_viability_financial_health,
            market_opportunity_traction: score.market_opportunity_traction,
            social_impact_job_creation: score.social_impact_job_creation,
            innovation_technology_adoption: score.innovation_technology_adoption,
            sustainability_environmental_impact: score.sustainability_environmental_impact,
            management_leadership: score.management_leadership
          },
          comments: score.comments,
          recommendations: score.recommendations,
          scored_at: score.scored_at
        }
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

// Pool-stats endpoint removed due to persistent 500 errors
// The judge dashboard can work without this endpoint

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
