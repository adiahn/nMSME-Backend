const Score = require('../models/Score');
const ApplicationAssignment = require('../models/ApplicationAssignment');
const Judge = require('../models/Judge');
const Application = require('../models/Application');

// @desc    Get judge dashboard
// @route   GET /api/judge/dashboard
// @access  Private (Judge only)
const getJudgeDashboard = async (req, res) => {
  try {
    const judgeId = req.user.judge.id;
    
    // Get judge profile
    const judge = await Judge.findById(judgeId);
    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Judge profile not found'
      });
    }

    // Get recent assignments
    const assignments = await ApplicationAssignment.find({ judge_id: judgeId })
      .populate('application_id', 'business_name category status')
      .sort({ assigned_at: -1 })
      .limit(5);

    // Get statistics
    const totalAssignments = await ApplicationAssignment.countDocuments({ judge_id: judgeId });
    const pendingAssignments = await ApplicationAssignment.countDocuments({ 
      judge_id: judgeId, 
      status: 'assigned' 
    });
    const inProgressAssignments = await ApplicationAssignment.countDocuments({ 
      judge_id: judgeId, 
      status: 'under_review' 
    });
    const completedAssignments = await ApplicationAssignment.countDocuments({ 
      judge_id: judgeId, 
      status: 'completed' 
    });

    // Get average score
    const scores = await Score.find({ 
      assignment_id: { $in: assignments.map(a => a._id) } 
    });
    const averageScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score.weighted_score, 0) / scores.length 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        judge: {
          id: judge._id,
          name: judge.name,
          expertise: judge.expertise,
          total_applications_reviewed: completedAssignments,
          average_score_given: Math.round(averageScore * 100) / 100
        },
        assignments,
        statistics: {
          total: totalAssignments,
          pending: pendingAssignments,
          in_progress: inProgressAssignments,
          completed: completedAssignments
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard',
      error: error.message
    });
  }
};

// @desc    Get all assignments for judge
// @route   GET /api/judge/assignments
// @access  Private (Judge only)
const getAssignments = async (req, res) => {
  try {
    const judgeId = req.user.judge.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const category = req.query.category;
    const sort = req.query.sort || 'assigned_at';

    // Build query
    const query = { judge_id: judgeId };
    if (status) query.status = status;

    // Build aggregation pipeline
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'applications',
          localField: 'application_id',
          foreignField: '_id',
          as: 'application'
        }
      },
      { $unwind: '$application' },
      {
        $lookup: {
          from: 'scores',
          localField: '_id',
          foreignField: 'assignment_id',
          as: 'score'
        }
      }
    ];

    // Add category filter if specified
    if (category) {
      pipeline.push({
        $match: { 'application.category': category }
      });
    }

    // Add sorting
    const sortObj = {};
    if (sort === 'assigned_at') sortObj.assigned_at = -1;
    else if (sort === 'business_name') sortObj['application.business_name'] = 1;
    else if (sort === 'category') sortObj['application.category'] = 1;
    else if (sort === 'status') sortObj.status = 1;

    pipeline.push({ $sort: sortObj });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await ApplicationAssignment.aggregate(countPipeline);
    const totalItems = countResult.length > 0 ? countResult[0].total : 0;

    // Add pagination
    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    const assignments = await ApplicationAssignment.aggregate(pipeline);

    // Format response
    const formattedAssignments = assignments.map(assignment => ({
      id: assignment._id,
      application: {
        business_name: assignment.application.business_name,
        category: assignment.application.category,
        business_description: assignment.application.business_description,
        financial_data: assignment.application.financial_data
      },
      status: assignment.status,
      assigned_at: assignment.assigned_at,
      score: assignment.score.length > 0 ? assignment.score[0] : null
    }));

    res.status(200).json({
      success: true,
      data: {
        assignments: formattedAssignments,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalItems / limit),
          total_items: totalItems,
          items_per_page: limit
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assignments',
      error: error.message
    });
  }
};

// @desc    Get specific assignment by ID
// @route   GET /api/judge/assignments/:id
// @access  Private (Judge only)
const getAssignmentById = async (req, res) => {
  try {
    const judgeId = req.user.judge.id;
    const assignmentId = req.params.id;

    const assignment = await ApplicationAssignment.findOne({
      _id: assignmentId,
      judge_id: judgeId
    }).populate('application_id');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Anonymize business name for review
    const anonymizedApplication = {
      ...assignment.application_id.toObject(),
      business_name: '[ANONYMIZED]'
    };

    res.status(200).json({
      success: true,
      data: {
        assignment: {
          id: assignment._id,
          status: assignment.status,
          assigned_at: assignment.assigned_at,
          started_at: assignment.started_at,
          completed_at: assignment.completed_at
        },
        application: anonymizedApplication
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment',
      error: error.message
    });
  }
};

// @desc    Start reviewing an assignment
// @route   POST /api/judge/assignments/:id/start-review
// @access  Private (Judge only)
const startReview = async (req, res) => {
  try {
    const judgeId = req.user.judge.id;
    const assignmentId = req.params.id;

    const assignment = await ApplicationAssignment.findOne({
      _id: assignmentId,
      judge_id: judgeId,
      status: 'assigned'
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or already in progress'
      });
    }

    // Update assignment status
    assignment.status = 'under_review';
    assignment.started_at = new Date();
    await assignment.save();

    res.status(200).json({
      success: true,
      data: {
        assignment: {
          id: assignment._id,
          status: assignment.status,
          started_at: assignment.started_at
        },
        message: 'Review started successfully'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting review',
      error: error.message
    });
  }
};

// @desc    Submit score for an assignment
// @route   POST /api/judge/assignments/:id/score
// @access  Private (Judge only)
const submitScore = async (req, res) => {
  try {
    const judgeId = req.user.judge.id;
    const assignmentId = req.params.id;
    const {
      innovation_differentiation,
      market_traction_growth,
      impact_job_creation,
      financial_health_governance,
      inclusion_sustainability,
      scalability_award_use,
      comments,
      review_notes,
      time_spent_minutes
    } = req.body;

    // Validate assignment exists and belongs to judge
    const assignment = await ApplicationAssignment.findOne({
      _id: assignmentId,
      judge_id: judgeId,
      status: { $in: ['assigned', 'under_review'] }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or already completed'
      });
    }

    // Validate score ranges (0-100)
    const scores = [
      innovation_differentiation,
      market_traction_growth,
      impact_job_creation,
      financial_health_governance,
      inclusion_sustainability,
      scalability_award_use
    ];

    for (let score of scores) {
      if (score < 0 || score > 100) {
        return res.status(400).json({
          success: false,
          message: 'All scores must be between 0 and 100'
        });
      }
    }

    // Check if score already exists
    const existingScore = await Score.findOne({ assignment_id: assignmentId });
    if (existingScore) {
      return res.status(400).json({
        success: false,
        message: 'Score already submitted for this assignment'
      });
    }

    // Create score record (total_score and weighted_score calculated automatically)
    const score = await Score.create({
      assignment_id: assignmentId,
      innovation_differentiation,
      market_traction_growth,
      impact_job_creation,
      financial_health_governance,
      inclusion_sustainability,
      scalability_award_use,
      comments,
      review_notes,
      time_spent_minutes
    });

    // Update assignment status
    assignment.status = 'completed';
    assignment.completed_at = new Date();
    assignment.time_spent_minutes = time_spent_minutes;
    await assignment.save();

    // Update judge statistics
    await updateJudgeStatistics(judgeId);

    res.status(201).json({
      success: true,
      data: {
        score: {
          id: score._id,
          total_score: score.total_score,
          weighted_score: score.weighted_score,
          grade: score.grade,
          scored_at: score.scored_at
        },
        assignment: {
          id: assignment._id,
          status: assignment.status,
          completed_at: assignment.completed_at,
          time_spent_minutes: assignment.time_spent_minutes
        },
        message: 'Score submitted successfully'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting score',
      error: error.message
    });
  }
};

// Helper function to update judge statistics
const updateJudgeStatistics = async (judgeId) => {
  try {
    const completedAssignments = await ApplicationAssignment.countDocuments({
      judge_id: judgeId,
      status: 'completed'
    });

    const scores = await Score.aggregate([
      {
        $lookup: {
          from: 'applicationassignments',
          localField: 'assignment_id',
          foreignField: '_id',
          as: 'assignment'
        }
      },
      { $unwind: '$assignment' },
      { $match: { 'assignment.judge_id': judgeId } }
    ]);

    const averageScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + score.weighted_score, 0) / scores.length
      : 0;

    await Judge.findByIdAndUpdate(judgeId, {
      total_applications_reviewed: completedAssignments,
      average_score_given: Math.round(averageScore * 100) / 100
    });

  } catch (error) {
    console.error('Error updating judge statistics:', error);
  }
};

module.exports = {
  getJudgeDashboard,
  getAssignments,
  getAssignmentById,
  startReview,
  submitScore
};
