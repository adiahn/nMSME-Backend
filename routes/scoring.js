const express = require('express');
const { body, validationResult } = require('express-validator');
const { Application } = require('../models/Application');
const { Score } = require('../models/Score');
const { Judge } = require('../models/Judge');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Submit score for an application
// @route   POST /api/scoring/score/:applicationId
// @access  Private (Judge only)
router.post('/score/:applicationId', [
  protect,
  authorize('judge'),
  body('business_viability_financial_health')
    .isNumeric()
    .withMessage('Business viability & financial health score must be a number')
    .isFloat({ min: 0, max: 25 })
    .withMessage('Business viability & financial health score must be between 0 and 25'),
  body('market_opportunity_traction')
    .isNumeric()
    .withMessage('Market opportunity & traction score must be a number')
    .isFloat({ min: 0, max: 20 })
    .withMessage('Market opportunity & traction score must be between 0 and 20'),
  body('social_impact_job_creation')
    .isNumeric()
    .withMessage('Social impact & job creation score must be a number')
    .isFloat({ min: 0, max: 20 })
    .withMessage('Social impact & job creation score must be between 0 and 20'),
  body('innovation_technology_adoption')
    .isNumeric()
    .withMessage('Innovation & technology adoption score must be a number')
    .isFloat({ min: 0, max: 15 })
    .withMessage('Innovation & technology adoption score must be between 0 and 15'),
  body('sustainability_environmental_impact')
    .isNumeric()
    .withMessage('Sustainability & environmental impact score must be a number')
    .isFloat({ min: 0, max: 10 })
    .withMessage('Sustainability & environmental impact score must be between 0 and 10'),
  body('management_leadership')
    .isNumeric()
    .withMessage('Management & leadership score must be a number')
    .isFloat({ min: 0, max: 10 })
    .withMessage('Management & leadership score must be between 0 and 10'),
  body('comments')
    .optional()
    .isString()
    .withMessage('Comments must be a string')
    .isLength({ max: 1000 })
    .withMessage('Comments must not exceed 1000 characters'),
  body('review_notes')
    .optional()
    .isString()
    .withMessage('Review notes must be a string')
    .isLength({ max: 2000 })
    .withMessage('Review notes must not exceed 2000 characters'),
  body('time_spent_minutes')
    .optional()
    .isNumeric()
    .withMessage('Time spent must be a number')
    .isFloat({ min: 0 })
    .withMessage('Time spent must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { applicationId } = req.params;
    const {
      business_viability_financial_health,
      market_opportunity_traction,
      social_impact_job_creation,
      innovation_technology_adoption,
      sustainability_environmental_impact,
      management_leadership,
      comments,
      review_notes,
      time_spent_minutes
    } = req.body;

    // Find the application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check if judge has already scored this application
    const existingScore = await Score.findOne({
      assignment_id: applicationId,
      judge_id: req.user.id
    });

    if (existingScore) {
      return res.status(400).json({
        success: false,
        error: 'You have already scored this application'
      });
    }

    // Create new score
    const scoreData = {
      assignment_id: applicationId,
      judge_id: req.user.id,
      business_viability_financial_health,
      market_opportunity_traction,
      social_impact_job_creation,
      innovation_technology_adoption,
      sustainability_environmental_impact,
      management_leadership,
      comments: comments || '',
      review_notes: review_notes || '',
      time_spent_minutes: time_spent_minutes || 0
    };

    const score = new Score(scoreData);
    await score.save();

    // Update application with the score
    application.scores.push({
      judge_id: req.user.id,
      business_viability_financial_health: {
        score: business_viability_financial_health,
        comments: comments || ''
      },
      market_opportunity_traction: {
        score: market_opportunity_traction,
        comments: comments || ''
      },
      social_impact_job_creation: {
        score: social_impact_job_creation,
        comments: comments || ''
      },
      innovation_technology_adoption: {
        score: innovation_technology_adoption,
        comments: comments || ''
      },
      sustainability_environmental_impact: {
        score: sustainability_environmental_impact,
        comments: comments || ''
      },
      management_leadership: {
        score: management_leadership,
        comments: comments || ''
      },
      total_score: score.total_score,
      grade: score.grade,
      date: new Date()
    });

    // Calculate average score
    const allScores = application.scores.map(s => s.total_score);
    application.average_score = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    application.total_score = allScores.reduce((sum, score) => sum + score, 0);

    await application.save();

    res.status(201).json({
      success: true,
      message: 'Score submitted successfully',
      data: {
        score: {
          id: score._id,
          total_score: score.total_score,
          weighted_score: score.weighted_score,
          grade: score.grade,
          criteria_scores: {
            business_viability_financial_health,
            market_opportunity_traction,
            social_impact_job_creation,
            innovation_technology_adoption,
            sustainability_environmental_impact,
            management_leadership
          },
          comments,
          review_notes,
          time_spent_minutes,
          scored_at: score.scored_at
        },
        application: {
          id: application._id,
          business_name: application.business_name,
          average_score: application.average_score,
          total_score: application.total_score,
          scores_count: application.scores.length
        }
      }
    });

  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// @desc    Update existing score
// @route   PUT /api/scoring/score/:scoreId
// @access  Private (Judge only)
router.put('/score/:scoreId', [
  protect,
  authorize('judge'),
  body('business_viability_financial_health')
    .optional()
    .isNumeric()
    .withMessage('Business viability & financial health score must be a number')
    .isFloat({ min: 0, max: 25 })
    .withMessage('Business viability & financial health score must be between 0 and 25'),
  body('market_opportunity_traction')
    .optional()
    .isNumeric()
    .withMessage('Market opportunity & traction score must be a number')
    .isFloat({ min: 0, max: 20 })
    .withMessage('Market opportunity & traction score must be between 0 and 20'),
  body('social_impact_job_creation')
    .optional()
    .isNumeric()
    .withMessage('Social impact & job creation score must be a number')
    .isFloat({ min: 0, max: 20 })
    .withMessage('Social impact & job creation score must be between 0 and 20'),
  body('innovation_technology_adoption')
    .optional()
    .isNumeric()
    .withMessage('Innovation & technology adoption score must be a number')
    .isFloat({ min: 0, max: 15 })
    .withMessage('Innovation & technology adoption score must be between 0 and 15'),
  body('sustainability_environmental_impact')
    .optional()
    .isNumeric()
    .withMessage('Sustainability & environmental impact score must be a number')
    .isFloat({ min: 0, max: 10 })
    .withMessage('Sustainability & environmental impact score must be between 0 and 10'),
  body('management_leadership')
    .optional()
    .isNumeric()
    .withMessage('Management & leadership score must be a number')
    .isFloat({ min: 0, max: 10 })
    .withMessage('Management & leadership score must be between 0 and 10')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { scoreId } = req.params;
    const updateData = req.body;

    // Find the score
    const score = await Score.findById(scoreId);
    if (!score) {
      return res.status(404).json({
        success: false,
        error: 'Score not found'
      });
    }

    // Check if the judge owns this score
    if (score.judge_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this score'
      });
    }

    // Update the score
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        score[key] = updateData[key];
      }
    });

    await score.save();

    res.json({
      success: true,
      message: 'Score updated successfully',
      data: {
        score: {
          id: score._id,
          total_score: score.total_score,
          weighted_score: score.weighted_score,
          grade: score.grade,
          criteria_scores: {
            business_viability_financial_health: score.business_viability_financial_health,
            market_opportunity_traction: score.market_opportunity_traction,
            social_impact_job_creation: score.social_impact_job_creation,
            innovation_technology_adoption: score.innovation_technology_adoption,
            sustainability_environmental_impact: score.sustainability_environmental_impact,
            management_leadership: score.management_leadership
          },
          comments: score.comments,
          review_notes: score.review_notes,
          time_spent_minutes: score.time_spent_minutes,
          scored_at: score.scored_at
        }
      }
    });

  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// @desc    Get scores for an application
// @route   GET /api/scoring/scores/:applicationId
// @access  Private (Judge/Admin only)
router.get('/scores/:applicationId', [
  protect,
  authorize('judge', 'admin', 'super_admin')
], async (req, res) => {
  try {
    const { applicationId } = req.params;

    const scores = await Score.find({ assignment_id: applicationId })
      .populate('judge_id', 'first_name last_name email')
      .sort({ scored_at: -1 });

    res.json({
      success: true,
      data: {
        application_id: applicationId,
        scores: scores.map(score => ({
          id: score._id,
          judge: {
            id: score.judge_id._id,
            name: `${score.judge_id.first_name} ${score.judge_id.last_name}`,
            email: score.judge_id.email
          },
          total_score: score.total_score,
          weighted_score: score.weighted_score,
          grade: score.grade,
          criteria_scores: {
            business_viability_financial_health: score.business_viability_financial_health,
            market_opportunity_traction: score.market_opportunity_traction,
            social_impact_job_creation: score.social_impact_job_creation,
            innovation_technology_adoption: score.innovation_technology_adoption,
            sustainability_environmental_impact: score.sustainability_environmental_impact,
            management_leadership: score.management_leadership
          },
          comments: score.comments,
          review_notes: score.review_notes,
          time_spent_minutes: score.time_spent_minutes,
          scored_at: score.scored_at
        })),
        count: scores.length
      }
    });

  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// @desc    Get judge's scoring statistics
// @route   GET /api/scoring/statistics
// @access  Private (Judge only)
router.get('/statistics', [
  protect,
  authorize('judge')
], async (req, res) => {
  try {
    const judgeId = req.user.id;

    // Get judge's scores
    const scores = await Score.find({ judge_id: judgeId });

    // Calculate statistics
    const totalScores = scores.length;
    const averageScore = totalScores > 0 ? scores.reduce((sum, score) => sum + score.total_score, 0) / totalScores : 0;
    const totalTimeSpent = scores.reduce((sum, score) => sum + (score.time_spent_minutes || 0), 0);

    // Grade distribution
    const gradeDistribution = scores.reduce((acc, score) => {
      acc[score.grade] = (acc[score.grade] || 0) + 1;
      return acc;
    }, {});

    // Criteria averages
    const criteriaAverages = {
      business_viability_financial_health: totalScores > 0 ? scores.reduce((sum, score) => sum + score.business_viability_financial_health, 0) / totalScores : 0,
      market_opportunity_traction: totalScores > 0 ? scores.reduce((sum, score) => sum + score.market_opportunity_traction, 0) / totalScores : 0,
      social_impact_job_creation: totalScores > 0 ? scores.reduce((sum, score) => sum + score.social_impact_job_creation, 0) / totalScores : 0,
      innovation_technology_adoption: totalScores > 0 ? scores.reduce((sum, score) => sum + score.innovation_technology_adoption, 0) / totalScores : 0,
      sustainability_environmental_impact: totalScores > 0 ? scores.reduce((sum, score) => sum + score.sustainability_environmental_impact, 0) / totalScores : 0,
      management_leadership: totalScores > 0 ? scores.reduce((sum, score) => sum + score.management_leadership, 0) / totalScores : 0
    };

    res.json({
      success: true,
      data: {
        judge_id: judgeId,
        total_scores: totalScores,
        average_score: Math.round(averageScore * 100) / 100,
        total_time_spent_minutes: totalTimeSpent,
        grade_distribution,
        criteria_averages: criteriaAverages
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// @desc    Get scoring criteria information
// @route   GET /api/scoring/criteria
// @access  Public
router.get('/criteria', (req, res) => {
  res.json({
    success: true,
    data: {
      criteria: [
        {
          name: 'business_viability_financial_health',
          display_name: 'Business Viability & Financial Health',
          weight: 25,
          max_score: 25,
          description: 'Revenue growth, profitability, financial management, debt management, cash flow, and financial projections',
          sub_criteria: [
            'Revenue growth and profitability',
            'Financial management and record-keeping',
            'Debt management and cash flow',
            'Financial projections and planning'
          ]
        },
        {
          name: 'market_opportunity_traction',
          display_name: 'Market Opportunity & Traction',
          weight: 20,
          max_score: 20,
          description: 'Market size, customer validation, sales performance, and competitive positioning',
          sub_criteria: [
            'Market size and opportunity',
            'Customer validation and feedback',
            'Sales performance and growth',
            'Competitive positioning'
          ]
        },
        {
          name: 'social_impact_job_creation',
          display_name: 'Social Impact & Job Creation',
          weight: 20,
          max_score: 20,
          description: 'Employment generation, community impact, women and youth employment, and local economic contribution',
          sub_criteria: [
            'Number of jobs created',
            'Community impact and engagement',
            'Women and youth employment',
            'Local economic contribution'
          ]
        },
        {
          name: 'innovation_technology_adoption',
          display_name: 'Innovation & Technology Adoption',
          weight: 15,
          max_score: 15,
          description: 'Use of technology, process innovation, product/service innovation, and digital transformation readiness',
          sub_criteria: [
            'Use of technology and digital tools',
            'Process innovation and efficiency',
            'Product/service innovation',
            'Digital transformation readiness'
          ]
        },
        {
          name: 'sustainability_environmental_impact',
          display_name: 'Sustainability & Environmental Impact',
          weight: 10,
          max_score: 10,
          description: 'Environmental practices, sustainable business model, resource efficiency, and green initiatives',
          sub_criteria: [
            'Environmental practices',
            'Sustainable business model',
            'Resource efficiency',
            'Green initiatives'
          ]
        },
        {
          name: 'management_leadership',
          display_name: 'Management & Leadership',
          weight: 10,
          max_score: 10,
          description: 'Leadership quality, team management, strategic planning, and risk management',
          sub_criteria: [
            'Leadership quality and experience',
            'Team management and development',
            'Strategic planning and execution',
            'Risk management'
          ]
        }
      ],
      total_weight: 100,
      grade_ranges: {
        'A+': { min: 90, max: 100, description: 'Exceptional' },
        'A': { min: 80, max: 89, description: 'Excellent' },
        'B+': { min: 70, max: 79, description: 'Good' },
        'B': { min: 60, max: 69, description: 'Satisfactory' },
        'C+': { min: 50, max: 59, description: 'Needs Improvement' },
        'C': { min: 40, max: 49, description: 'Poor' },
        'D': { min: 30, max: 39, description: 'Very Poor' },
        'F': { min: 0, max: 29, description: 'Unsatisfactory' }
      }
    }
  });
});

module.exports = router;

