/**
 * Utility functions for scoring calculations and grading
 */

/**
 * Calculate total score from individual criteria scores
 * @param {Object} criteriaScores - Object containing scores for each criterion
 * @returns {number} Total score (0-100)
 */
function calculateTotalScore(criteriaScores) {
  const {
    business_viability_financial_health = 0,
    market_opportunity_traction = 0,
    social_impact_job_creation = 0,
    innovation_technology_adoption = 0,
    sustainability_environmental_impact = 0,
    management_leadership = 0
  } = criteriaScores;

  return business_viability_financial_health +
         market_opportunity_traction +
         social_impact_job_creation +
         innovation_technology_adoption +
         sustainability_environmental_impact +
         management_leadership;
}

/**
 * Calculate weighted score (already weighted by max values)
 * @param {Object} criteriaScores - Object containing scores for each criterion
 * @returns {number} Weighted score (0-100)
 */
function calculateWeightedScore(criteriaScores) {
  // Since max values are already weighted, total score is the weighted score
  return calculateTotalScore(criteriaScores);
}

/**
 * Determine grade based on total score
 * @param {number} totalScore - Total score (0-100)
 * @returns {string} Grade (A+ to F)
 */
function calculateGrade(totalScore) {
  if (totalScore >= 90) return 'A+';
  if (totalScore >= 80) return 'A';
  if (totalScore >= 70) return 'B+';
  if (totalScore >= 60) return 'B';
  if (totalScore >= 50) return 'C+';
  if (totalScore >= 40) return 'C';
  if (totalScore >= 30) return 'D';
  return 'F';
}

/**
 * Get grade description
 * @param {string} grade - Grade (A+ to F)
 * @returns {string} Grade description
 */
function getGradeDescription(grade) {
  const descriptions = {
    'A+': 'Exceptional',
    'A': 'Excellent',
    'B+': 'Good',
    'B': 'Satisfactory',
    'C+': 'Needs Improvement',
    'C': 'Poor',
    'D': 'Very Poor',
    'F': 'Unsatisfactory'
  };
  return descriptions[grade] || 'Unknown';
}

/**
 * Validate scoring criteria
 * @param {Object} criteriaScores - Object containing scores for each criterion
 * @returns {Object} Validation result
 */
function validateScoringCriteria(criteriaScores) {
  const errors = [];
  const warnings = [];

  // Define criteria with their max values
  const criteria = {
    business_viability_financial_health: { max: 25, name: 'Business Viability & Financial Health' },
    market_opportunity_traction: { max: 20, name: 'Market Opportunity & Traction' },
    social_impact_job_creation: { max: 20, name: 'Social Impact & Job Creation' },
    innovation_technology_adoption: { max: 15, name: 'Innovation & Technology Adoption' },
    sustainability_environmental_impact: { max: 10, name: 'Sustainability & Environmental Impact' },
    management_leadership: { max: 10, name: 'Management & Leadership' }
  };

  // Validate each criterion
  Object.keys(criteria).forEach(key => {
    const score = criteriaScores[key];
    const { max, name } = criteria[key];

    if (score === undefined || score === null) {
      errors.push(`${name} score is required`);
    } else if (typeof score !== 'number') {
      errors.push(`${name} score must be a number`);
    } else if (score < 0) {
      errors.push(`${name} score cannot be negative`);
    } else if (score > max) {
      errors.push(`${name} score cannot exceed ${max}`);
    } else if (score > max * 0.8) {
      warnings.push(`${name} score is very high (${score}/${max})`);
    } else if (score < max * 0.2) {
      warnings.push(`${name} score is very low (${score}/${max})`);
    }
  });

  // Check for missing criteria
  const missingCriteria = Object.keys(criteria).filter(key => 
    criteriaScores[key] === undefined || criteriaScores[key] === null
  );

  if (missingCriteria.length > 0) {
    errors.push(`Missing scores for: ${missingCriteria.map(key => criteria[key].name).join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate average score from multiple scores
 * @param {Array} scores - Array of score objects
 * @returns {Object} Average scores and statistics
 */
function calculateAverageScores(scores) {
  if (!scores || scores.length === 0) {
    return {
      averageTotalScore: 0,
      averageWeightedScore: 0,
      averageGrade: 'F',
      criteriaAverages: {},
      totalScores: 0,
      gradeDistribution: {}
    };
  }

  const criteria = [
    'business_viability_financial_health',
    'market_opportunity_traction',
    'social_impact_job_creation',
    'innovation_technology_adoption',
    'sustainability_environmental_impact',
    'management_leadership'
  ];

  // Calculate averages for each criterion
  const criteriaAverages = {};
  criteria.forEach(criterion => {
    const validScores = scores
      .map(score => score[criterion])
      .filter(score => typeof score === 'number' && !isNaN(score));
    
    criteriaAverages[criterion] = validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
      : 0;
  });

  // Calculate total and weighted averages
  const totalScores = scores.map(score => score.total_score || 0);
  const weightedScores = scores.map(score => score.weighted_score || 0);

  const averageTotalScore = totalScores.length > 0 
    ? totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length 
    : 0;

  const averageWeightedScore = weightedScores.length > 0 
    ? weightedScores.reduce((sum, score) => sum + score, 0) / weightedScores.length 
    : 0;

  // Calculate grade distribution
  const gradeDistribution = scores.reduce((acc, score) => {
    const grade = score.grade || calculateGrade(score.total_score || 0);
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {});

  return {
    averageTotalScore: Math.round(averageTotalScore * 100) / 100,
    averageWeightedScore: Math.round(averageWeightedScore * 100) / 100,
    averageGrade: calculateGrade(averageTotalScore),
    criteriaAverages: Object.keys(criteriaAverages).reduce((acc, key) => {
      acc[key] = Math.round(criteriaAverages[key] * 100) / 100;
      return acc;
    }, {}),
    totalScores: scores.length,
    gradeDistribution
  };
}

/**
 * Generate scoring report for an application
 * @param {Object} application - Application object with scores
 * @returns {Object} Scoring report
 */
function generateScoringReport(application) {
  const scores = application.scores || [];
  const averages = calculateAverageScores(scores);

  return {
    application_id: application._id,
    business_name: application.business_name,
    category: application.category,
    total_judges: scores.length,
    scoring_summary: {
      average_total_score: averages.averageTotalScore,
      average_weighted_score: averages.averageWeightedScore,
      average_grade: averages.averageGrade,
      grade_distribution: averages.gradeDistribution
    },
    criteria_analysis: {
      business_viability_financial_health: {
        average: averages.criteriaAverages.business_viability_financial_health,
        max_possible: 25,
        percentage: Math.round((averages.criteriaAverages.business_viability_financial_health / 25) * 100)
      },
      market_opportunity_traction: {
        average: averages.criteriaAverages.market_opportunity_traction,
        max_possible: 20,
        percentage: Math.round((averages.criteriaAverages.market_opportunity_traction / 20) * 100)
      },
      social_impact_job_creation: {
        average: averages.criteriaAverages.social_impact_job_creation,
        max_possible: 20,
        percentage: Math.round((averages.criteriaAverages.social_impact_job_creation / 20) * 100)
      },
      innovation_technology_adoption: {
        average: averages.criteriaAverages.innovation_technology_adoption,
        max_possible: 15,
        percentage: Math.round((averages.criteriaAverages.innovation_technology_adoption / 15) * 100)
      },
      sustainability_environmental_impact: {
        average: averages.criteriaAverages.sustainability_environmental_impact,
        max_possible: 10,
        percentage: Math.round((averages.criteriaAverages.sustainability_environmental_impact / 10) * 100)
      },
      management_leadership: {
        average: averages.criteriaAverages.management_leadership,
        max_possible: 10,
        percentage: Math.round((averages.criteriaAverages.management_leadership / 10) * 100)
      }
    },
    individual_scores: scores.map(score => ({
      judge_id: score.judge_id,
      total_score: score.total_score,
      weighted_score: score.weighted_score,
      grade: score.grade,
      scored_at: score.date
    }))
  };
}

/**
 * Get scoring criteria information
 * @returns {Object} Scoring criteria details
 */
function getScoringCriteria() {
  return {
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
  };
}

module.exports = {
  calculateTotalScore,
  calculateWeightedScore,
  calculateGrade,
  getGradeDescription,
  validateScoringCriteria,
  calculateAverageScores,
  generateScoringReport,
  getScoringCriteria
};

