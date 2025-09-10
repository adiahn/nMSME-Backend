# nMSME Awards Scoring System

## Overview

The nMSME Awards Portal implements a comprehensive 6-criteria scoring system for evaluating MSME applications. This system provides judges with a structured, objective way to assess applications across multiple dimensions critical to business success.

## Scoring Criteria

### 1. Business Viability & Financial Health (25 points)
**Weight:** 25% | **Max Score:** 25 points

**Description:** Evaluates the financial strength, sustainability, and business viability of the enterprise.

**Sub-criteria:**
- Revenue growth and profitability
- Financial management and record-keeping
- Debt management and cash flow
- Financial projections and planning

**Scoring Guidelines:**
- 20-25: Excellent financial health, strong growth, good management
- 15-19: Good financial position with minor areas for improvement
- 10-14: Adequate financial management with some concerns
- 5-9: Poor financial health, significant issues
- 0-4: Critical financial problems

### 2. Market Opportunity & Traction (20 points)
**Weight:** 20% | **Max Score:** 20 points

**Description:** Assesses market potential, customer validation, and business traction.

**Sub-criteria:**
- Market size and opportunity
- Customer validation and feedback
- Sales performance and growth
- Competitive positioning

**Scoring Guidelines:**
- 16-20: Strong market position, proven traction, clear competitive advantage
- 12-15: Good market presence with solid customer base
- 8-11: Moderate market traction with room for growth
- 4-7: Limited market presence, weak positioning
- 0-3: Poor market understanding, no traction

### 3. Social Impact & Job Creation (20 points)
**Weight:** 20% | **Max Score:** 20 points

**Description:** Measures the social and economic impact of the business on communities and employment.

**Sub-criteria:**
- Number of jobs created
- Community impact and engagement
- Women and youth employment
- Local economic contribution

**Scoring Guidelines:**
- 16-20: Significant job creation, strong community impact
- 12-15: Good employment generation, positive community effect
- 8-11: Moderate social impact, some job creation
- 4-7: Limited social impact, minimal job creation
- 0-3: No significant social impact

### 4. Innovation & Technology Adoption (15 points)
**Weight:** 15% | **Max Score:** 15 points

**Description:** Evaluates the use of technology, innovation, and digital transformation.

**Sub-criteria:**
- Use of technology and digital tools
- Process innovation and efficiency
- Product/service innovation
- Digital transformation readiness

**Scoring Guidelines:**
- 12-15: High innovation, advanced technology adoption
- 9-11: Good use of technology, some innovation
- 6-8: Basic technology use, limited innovation
- 3-5: Minimal technology adoption
- 0-2: No technology use or innovation

### 5. Sustainability & Environmental Impact (10 points)
**Weight:** 10% | **Max Score:** 10 points

**Description:** Assesses environmental practices and sustainable business operations.

**Sub-criteria:**
- Environmental practices
- Sustainable business model
- Resource efficiency
- Green initiatives

**Scoring Guidelines:**
- 8-10: Excellent sustainability practices, strong environmental focus
- 6-7: Good environmental practices, some sustainability measures
- 4-5: Basic environmental awareness, limited practices
- 2-3: Minimal environmental consideration
- 0-1: No environmental awareness

### 6. Management & Leadership (10 points)
**Weight:** 10% | **Max Score:** 10 points

**Description:** Evaluates leadership quality, team management, and strategic planning.

**Sub-criteria:**
- Leadership quality and experience
- Team management and development
- Strategic planning and execution
- Risk management

**Scoring Guidelines:**
- 8-10: Excellent leadership, strong management capabilities
- 6-7: Good leadership and management skills
- 4-5: Adequate management with some weaknesses
- 2-3: Poor leadership, management issues
- 0-1: Critical leadership problems

## Grading System

| Grade | Score Range | Description |
|-------|-------------|-------------|
| A+    | 90-100      | Exceptional |
| A     | 80-89       | Excellent   |
| B+    | 70-79       | Good        |
| B     | 60-69       | Satisfactory|
| C+    | 50-59       | Needs Improvement |
| C     | 40-49       | Poor        |
| D     | 30-39       | Very Poor   |
| F     | 0-29        | Unsatisfactory |

## API Endpoints

### Submit Score
**POST** `/api/scoring/score/:applicationId`

**Request Body:**
```json
{
  "business_viability_financial_health": 22,
  "market_opportunity_traction": 18,
  "social_impact_job_creation": 16,
  "innovation_technology_adoption": 12,
  "sustainability_environmental_impact": 8,
  "management_leadership": 9,
  "comments": "Excellent application with strong potential",
  "review_notes": "This business shows great promise in all areas",
  "time_spent_minutes": 45
}
```

**Response:**
```json
{
  "success": true,
  "message": "Score submitted successfully",
  "data": {
    "score": {
      "id": "score_id",
      "total_score": 85,
      "weighted_score": 85,
      "grade": "A",
      "criteria_scores": { ... },
      "comments": "...",
      "scored_at": "2025-01-XX"
    },
    "application": {
      "id": "app_id",
      "business_name": "Business Name",
      "average_score": 85,
      "scores_count": 1
    }
  }
}
```

### Update Score
**PUT** `/api/scoring/score/:scoreId`

**Request Body:** Same as submit score (all fields optional)

### Get Scores for Application
**GET** `/api/scoring/scores/:applicationId`

**Response:**
```json
{
  "success": true,
  "data": {
    "application_id": "app_id",
    "scores": [
      {
        "id": "score_id",
        "judge": {
          "id": "judge_id",
          "name": "Judge Name",
          "email": "judge@email.com"
        },
        "total_score": 85,
        "grade": "A",
        "criteria_scores": { ... },
        "scored_at": "2025-01-XX"
      }
    ],
    "count": 1
  }
}
```

### Get Judge Statistics
**GET** `/api/scoring/statistics`

**Response:**
```json
{
  "success": true,
  "data": {
    "judge_id": "judge_id",
    "total_scores": 5,
    "average_score": 78.5,
    "total_time_spent_minutes": 225,
    "grade_distribution": {
      "A": 2,
      "B+": 2,
      "B": 1
    },
    "criteria_averages": {
      "business_viability_financial_health": 20.5,
      "market_opportunity_traction": 16.2,
      "social_impact_job_creation": 15.8,
      "innovation_technology_adoption": 11.5,
      "sustainability_environmental_impact": 7.8,
      "management_leadership": 8.7
    }
  }
}
```

### Get Scoring Criteria
**GET** `/api/scoring/criteria`

**Response:**
```json
{
  "success": true,
  "data": {
    "criteria": [
      {
        "name": "business_viability_financial_health",
        "display_name": "Business Viability & Financial Health",
        "weight": 25,
        "max_score": 25,
        "description": "Revenue growth, profitability, financial management...",
        "sub_criteria": [...]
      }
    ],
    "total_weight": 100,
    "grade_ranges": { ... }
  }
}
```

## Validation Rules

### Score Validation
- Each criterion score must be between 0 and its maximum value
- All 6 criteria must be provided
- Comments are required for total scores below 70
- Time spent must be a positive number

### Business Rules
- Judges can only score applications in their expertise categories
- Each judge can only score an application once
- Scores can be updated before final submission
- Applications must be in "submitted" status to be scored

## Database Schema

### Score Model
```javascript
{
  assignment_id: ObjectId, // Reference to application
  judge_id: ObjectId,      // Reference to judge
  business_viability_financial_health: Number, // 0-25
  market_opportunity_traction: Number,         // 0-20
  social_impact_job_creation: Number,          // 0-20
  innovation_technology_adoption: Number,      // 0-15
  sustainability_environmental_impact: Number, // 0-10
  management_leadership: Number,               // 0-10
  total_score: Number,     // Calculated (0-100)
  weighted_score: Number,  // Calculated (0-100)
  grade: String,          // Calculated (A+ to F)
  comments: String,       // Required for scores < 70
  review_notes: String,   // Optional detailed notes
  time_spent_minutes: Number, // Optional
  scored_at: Date        // Auto-generated
}
```

## Utility Functions

The system includes comprehensive utility functions in `utils/scoringUtils.js`:

- `calculateTotalScore(criteriaScores)` - Calculate total score
- `calculateWeightedScore(criteriaScores)` - Calculate weighted score
- `calculateGrade(totalScore)` - Determine grade from score
- `getGradeDescription(grade)` - Get grade description
- `validateScoringCriteria(criteriaScores)` - Validate scores
- `calculateAverageScores(scores)` - Calculate averages from multiple scores
- `generateScoringReport(application)` - Generate comprehensive report
- `getScoringCriteria()` - Get criteria information

## Implementation Notes

### Pre-save Middleware
The Score model includes pre-save middleware that automatically:
- Calculates total score from individual criteria
- Calculates weighted score (same as total due to weighting)
- Determines grade based on total score
- Validates comments requirement for low scores

### Error Handling
- Comprehensive validation with detailed error messages
- Graceful handling of edge cases
- Proper HTTP status codes and error responses

### Security
- Judge authentication required for all scoring endpoints
- Authorization checks ensure judges can only score assigned applications
- Input validation prevents invalid scores

## Testing

The system includes comprehensive tests in `scripts/test-scoring-simple.js` that validate:
- Utility function calculations
- Score validation
- Database operations
- Edge cases (perfect scores, minimum scores)
- Multiple scores analysis
- API endpoint functionality

## Frontend Integration

The frontend should:
1. Display the 6 criteria with their weights and descriptions
2. Provide scoring interfaces for each criterion (0 to max value)
3. Show real-time total score and grade calculation
4. Validate scores before submission
5. Display scoring history and statistics
6. Handle error messages and validation feedback

## Best Practices

### For Judges
- Score each criterion independently
- Provide constructive comments for low scores
- Use the full scoring range (0 to max) appropriately
- Consider all sub-criteria when scoring
- Take adequate time for thorough evaluation

### For Administrators
- Monitor scoring patterns and judge statistics
- Ensure fair distribution of applications
- Review and address any scoring anomalies
- Provide training on scoring criteria
- Maintain scoring consistency across judges

## Future Enhancements

Potential improvements to consider:
- Weighted scoring based on application category
- Peer review system for score validation
- Automated scoring suggestions based on application data
- Advanced analytics and reporting
- Integration with external evaluation tools
- Mobile-optimized scoring interface

