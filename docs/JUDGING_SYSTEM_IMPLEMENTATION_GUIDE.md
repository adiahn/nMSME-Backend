# nMSME Awards - Judging System Implementation Guide

## Overview

This document provides a comprehensive guide for implementing the judging system frontend based on the backend API implementation. The judging system features random distribution of applications, application locking, scoring, and review management.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Application Distribution System](#application-distribution-system)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Scoring System](#scoring-system)
7. [Application Locking System](#application-locking-system)
8. [Frontend Implementation Guide](#frontend-implementation-guide)
9. [Error Handling](#error-handling)
10. [Testing Guidelines](#testing-guidelines)

## System Architecture

### Core Components

1. **Random Distribution System**: Applications are randomly distributed among judges for equal workload
2. **Application Locking**: Prevents multiple judges from reviewing the same application simultaneously
3. **Scoring System**: 6-criteria scoring system with weighted scores
4. **Review Management**: Track review progress and completion status

### Key Features

- ✅ **Equal Workload Distribution**: Each judge gets 28-29 applications (115 total ÷ 4 judges)
- ✅ **Random Assignment**: Applications assigned randomly, not by expertise
- ✅ **Application Locking**: Prevents conflicts during review
- ✅ **Comprehensive Scoring**: 6 criteria with detailed sub-criteria
- ✅ **Review Tracking**: Monitor review progress and completion

## Authentication & Authorization

### Judge Authentication

```javascript
// All judge endpoints require authentication
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

### Role-Based Access

- **Judge**: Can view assigned applications, start reviews, submit scores
- **Admin**: Can manage judges, view all applications, override locks
- **Super Admin**: Full system access

## Application Distribution System

### Random Distribution Logic

```javascript
// Distribution is based on:
1. Total applications: 115
2. Total active judges: 4
3. Base per judge: 28 applications
4. Extra applications: 3 (distributed to first 3 judges)

// Judge assignments:
- Judge One: 29 applications (range 1-29)
- Judge Two: 29 applications (range 30-58)
- Judge Three: 29 applications (range 59-87)
- Judge Four: 28 applications (range 88-115)
```

### Distribution Features

- **Deterministic**: Same judge always gets same applications
- **Random**: Applications shuffled randomly for each judge
- **Equal**: Perfect workload distribution
- **No Bias**: No preference for expertise or category

## API Endpoints

### 1. Judge Dashboard

```http
GET /api/judge/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "judge_profile": {
      "expertise_sectors": ["fashion", "it"],
      "max_applications": 10,
      "is_active": true
    },
    "currently_reviewing": 2,
    "recent_scores": [...],
    "statistics": {
      "total_reviewing": 2,
      "completed_reviews": 15,
      "average_score": 78.5,
      "available_capacity": 8
    }
  }
}
```

### 2. Get Assigned Applications

```http
GET /api/judge/applications?page=1&limit=20&status=available
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: `available`, `reviewing`, `completed`

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "68ba8610a74ec456caa3cdb4",
        "business_name": "AXON DYNAMICS LIMITED",
        "sector": "Information Technology (IT)",
        "workflow_stage": "submitted",
        "expertise_match": true,
        "lock_status": {
          "is_locked": false,
          "locked_by": null,
          "expires_at": null
        },
        "assignment_status": "not_assigned",
        "review_stats": {
          "total_reviews": 0,
          "average_score": null
        }
      }
    ],
    "summary": {
      "total_applications": 29,
      "available": 115,
      "reviewing": 0,
      "completed": 0,
      "expertise_matches": 15,
      "overflow_applications": 14
    },
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_items": 29,
      "items_per_page": 20
    },
    "distribution_info": {
      "judge_index": 1,
      "total_judges": 4,
      "applications_per_judge": 28,
      "extra_applications": 3,
      "judge_range": "1-29",
      "distribution_method": "random_equal_workload"
    }
  }
}
```

### 3. Get Application Details

```http
GET /api/judge/applications/:applicationId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "68ba8610a74ec456caa3cdb4",
      "business_name": "AXON DYNAMICS LIMITED",
      "business_description": "Technology solutions provider",
      "sector": "Information Technology (IT)",
      "msme_strata": "small",
      "workflow_stage": "submitted",
      "submission_date": "2024-01-15T10:30:00Z",
      "applicant": {
        "id": "68ba8610a74ec456caa3cdb5",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@axondynamics.com"
      },
      "documents": [...],
      "pitch_video": {...},
      "financial_information": {...},
      "impact_metrics": {...}
    },
    "previous_scores": [...],
    "judge_authorization": {
      "can_view": true,
      "can_review": true,
      "expertise_match": true,
      "judge_sectors": ["Fashion", "Information Technology (IT)"],
      "distribution_method": "random_equal_workload"
    }
  }
}
```

### 4. Start Review (Acquire Lock)

```http
POST /api/judge/applications/:applicationId/review/start
```

**Request Body:**
```json
{
  "lock_duration": 60,
  "review_notes": "Starting detailed review",
  "expertise_match": true,
  "estimated_review_time": 45
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review started successfully",
  "data": {
    "lock": {
      "id": "68ba8610a74ec456caa3cdb6",
      "expires_at": "2024-01-15T11:30:00Z",
      "time_remaining": 60,
      "lock_type": "review"
    },
    "application_status": "under_review"
  }
}
```

### 5. Submit Score

```http
POST /api/judge/applications/:applicationId/score
```

**Request Body:**
```json
{
  "criteria_scores": {
    "business_viability_financial_health": 20,
    "market_opportunity_traction": 16,
    "social_impact_job_creation": 15,
    "innovation_technology_adoption": 12,
    "sustainability_environmental_impact": 8,
    "management_leadership": 7
  },
  "overall_score": 78,
  "comments": "Strong business model with good market traction",
  "recommendations": "Consider expanding to new markets",
  "review_notes": "Detailed review completed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Score submitted successfully",
  "data": {
    "score": {
      "id": "68ba8610a74ec456caa3cdb7",
      "total_score": 78,
      "criteria_scores": {...},
      "comments": "Strong business model with good market traction",
      "scored_at": "2024-01-15T11:15:00Z"
    },
    "lock_released": true
  }
}
```

### 6. Get Currently Reviewing Applications

```http
GET /api/judge/applications/reviewing
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currently_reviewing": [
      {
        "id": "68ba8610a74ec456caa3cdb4",
        "business_name": "AXON DYNAMICS LIMITED",
        "lock": {
          "id": "68ba8610a74ec456caa3cdb6",
          "expires_at": "2024-01-15T11:30:00Z",
          "time_remaining": 45,
          "lock_type": "review"
        },
        "review_session": {
          "started_at": "2024-01-15T10:45:00Z",
          "notes": "Review in progress"
        }
      }
    ],
    "statistics": {
      "total_reviewing": 1,
      "total_locks": 1,
      "average_time_remaining": 45
    }
  }
}
```

### 7. Get Completed Reviews

```http
GET /api/judge/applications/completed
```

**Response:**
```json
{
  "success": true,
  "data": {
    "completed_reviews": [
      {
        "id": "68ba8610a74ec456caa3cdb8",
        "business_name": "TECH SOLUTIONS LTD",
        "sector": "Information Technology (IT)",
        "score": {
          "total_score": 82,
          "grade": "A-",
          "scored_at": "2024-01-14T15:30:00Z"
        },
        "review_summary": "Excellent application with strong innovation"
      }
    ],
    "statistics": {
      "total_completed": 15,
      "average_score": 78.5,
      "completion_rate": 0.75
    }
  }
}
```

## Data Models

### Judge Model

```javascript
{
  user_id: ObjectId, // Reference to User
  expertise_sectors: ["fashion", "it", "agribusiness", ...],
  is_active: Boolean,
  assigned_applications_count: Number,
  max_applications_per_judge: Number,
  total_scores_submitted: Number,
  average_score_given: Number,
  conflict_declarations: [...],
  judging_history: [...]
}
```

### Score Model

```javascript
{
  assignment_id: ObjectId, // Reference to ApplicationAssignment
  judge_id: ObjectId, // Reference to Judge
  business_viability_financial_health: Number, // 0-25
  market_opportunity_traction: Number, // 0-20
  social_impact_job_creation: Number, // 0-20
  innovation_technology_adoption: Number, // 0-15
  sustainability_environmental_impact: Number, // 0-10
  management_leadership: Number, // 0-10
  total_score: Number, // 0-100 (calculated)
  weighted_score: Number, // 0-100 (calculated)
  grade: String, // A+, A, B+, B, C+, C, D, F
  comments: String,
  review_notes: String,
  time_spent_minutes: Number,
  scored_at: Date
}
```

### ApplicationLock Model

```javascript
{
  application_id: ObjectId, // Reference to Application
  judge_id: ObjectId, // Reference to Judge
  user_id: ObjectId, // Reference to User
  locked_at: Date,
  expires_at: Date,
  is_active: Boolean,
  lock_type: String, // "review", "scoring", "final_review"
  session_id: String,
  last_activity: Date
}
```

## Scoring System

### 6-Criteria Scoring System

| Criteria | Weight | Max Score | Description |
|----------|--------|-----------|-------------|
| Business Viability & Financial Health | 25% | 25 | Revenue growth, profitability, financial management |
| Market Opportunity & Traction | 20% | 20 | Market size, customer validation, sales performance |
| Social Impact & Job Creation | 20% | 20 | Employment generation, community impact |
| Innovation & Technology Adoption | 15% | 15 | Technology use, process innovation |
| Sustainability & Environmental Impact | 10% | 10 | Environmental practices, sustainability |
| Management & Leadership | 10% | 10 | Leadership quality, team management |

### Grade Ranges

| Grade | Score Range | Description |
|-------|-------------|-------------|
| A+ | 90-100 | Exceptional |
| A | 80-89 | Excellent |
| B+ | 70-79 | Good |
| B | 60-69 | Satisfactory |
| C+ | 50-59 | Needs Improvement |
| C | 40-49 | Poor |
| D | 30-39 | Very Poor |
| F | 0-29 | Unsatisfactory |

## Application Locking System

### Lock Types

1. **Review Lock**: For reviewing application details
2. **Scoring Lock**: For submitting scores
3. **Final Review Lock**: For final review rounds

### Lock Management

- **Duration**: Default 60 minutes, configurable
- **Auto-Release**: Locks expire automatically
- **Conflict Prevention**: Only one judge can lock an application
- **Activity Tracking**: Locks track last activity

### Lock States

```javascript
{
  is_locked: Boolean,
  locked_by: ObjectId | null,
  expires_at: Date | null,
  time_remaining: Number, // minutes
  lock_type: String,
  can_acquire: Boolean
}
```

## Frontend Implementation Guide

### 1. Judge Dashboard

```javascript
// Dashboard components needed:
- JudgeProfile: Display judge info and statistics
- ApplicationList: Show assigned applications with pagination
- ReviewProgress: Track currently reviewing applications
- CompletedReviews: Show completed reviews with scores
- Statistics: Display judge performance metrics
```

### 2. Application List View

```javascript
// Features to implement:
- Pagination controls
- Status filters (available, reviewing, completed)
- Search functionality
- Sort options
- Expertise match indicators
- Lock status indicators
```

### 3. Application Detail View

```javascript
// Components needed:
- ApplicationHeader: Business name, sector, status
- ApplicantInfo: Contact details, company info
- DocumentsViewer: PDF viewer for documents
- VideoPlayer: Pitch video player
- FinancialData: Revenue, growth metrics
- ImpactMetrics: Jobs created, community impact
- ReviewForm: Scoring interface
- PreviousScores: Other judges' scores (if any)
```

### 4. Scoring Interface

```javascript
// Scoring form components:
- CriteriaSliders: 6 sliders for each criterion
- ScoreValidation: Real-time validation
- CommentsField: Required for scores < 70
- RecommendationsField: Optional recommendations
- ReviewNotesField: Internal notes
- TimeTracking: Track review time
- SubmitButton: Submit score and release lock
```

### 5. Review Management

```javascript
// Review workflow:
1. Click "Start Review" → Acquire lock
2. Review application details
3. Fill scoring form
4. Submit score → Release lock
5. Application moves to "completed" status
```

## Error Handling

### Common Error Responses

```javascript
// 403 Forbidden
{
  "success": false,
  "error": "Access denied. Admin privileges required."
}

// 423 Locked
{
  "success": false,
  "error": "Application is currently locked by another judge",
  "lock_info": {
    "locked_by": "Judge Two",
    "expires_at": "2024-01-15T11:30:00Z",
    "time_remaining": 45
  }
}

// 410 Gone (Lock Expired)
{
  "success": false,
  "error": "Your review session has expired. Please start a new review."
}

// 400 Bad Request
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "business_viability_financial_health",
      "message": "Score must be between 0 and 25"
    }
  ]
}
```

### Error Handling Strategy

1. **Network Errors**: Retry with exponential backoff
2. **Validation Errors**: Show field-specific error messages
3. **Lock Conflicts**: Show lock information and retry options
4. **Session Expired**: Redirect to login
5. **Server Errors**: Show generic error message

## Testing Guidelines

### Unit Tests

```javascript
// Test components:
- ApplicationList component
- ScoringForm validation
- Lock management
- Error handling
- API integration
```

### Integration Tests

```javascript
// Test workflows:
- Complete review process
- Lock acquisition/release
- Score submission
- Error scenarios
- Pagination
```

### API Testing

```javascript
// Test endpoints:
- GET /api/judge/dashboard
- GET /api/judge/applications
- GET /api/judge/applications/:id
- POST /api/judge/applications/:id/review/start
- POST /api/judge/applications/:id/score
```

## Implementation Checklist

### Phase 1: Basic Structure
- [ ] Judge authentication
- [ ] Dashboard layout
- [ ] Application list view
- [ ] Basic navigation

### Phase 2: Application Review
- [ ] Application detail view
- [ ] Document viewer
- [ ] Video player
- [ ] Lock management

### Phase 3: Scoring System
- [ ] Scoring form
- [ ] Validation
- [ ] Score submission
- [ ] Review tracking

### Phase 4: Advanced Features
- [ ] Search and filtering
- [ ] Statistics dashboard
- [ ] Error handling
- [ ] Performance optimization

### Phase 5: Testing & Polish
- [ ] Unit tests
- [ ] Integration tests
- [ ] User acceptance testing
- [ ] Performance testing

## Additional Notes

### Performance Considerations

- **Pagination**: Use pagination for large application lists
- **Lazy Loading**: Load application details on demand
- **Caching**: Cache frequently accessed data
- **Optimistic Updates**: Update UI before API confirmation

### Security Considerations

- **Token Refresh**: Implement automatic token refresh
- **Input Validation**: Validate all user inputs
- **XSS Protection**: Sanitize user-generated content
- **CSRF Protection**: Use CSRF tokens for state-changing operations

### Accessibility

- **Keyboard Navigation**: Ensure all functionality is keyboard accessible
- **Screen Reader Support**: Add proper ARIA labels
- **Color Contrast**: Ensure sufficient color contrast
- **Focus Management**: Proper focus management for modals and forms

---

This guide provides a comprehensive foundation for implementing the judging system frontend. The backend is fully functional and ready for integration. For any questions or clarifications, please refer to the API documentation or contact the backend development team.
