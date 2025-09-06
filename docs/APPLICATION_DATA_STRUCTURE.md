# Application Data Structure

## Overview
This document outlines the exact data structure for applications in the nMSME Awards system, including what the backend expects to receive and what it returns.

## Backend Data Structure

### Application Model Fields (What's Actually Stored)

The Application model stores the following fields:

#### Business Information
- `business_name` (String, required)
- `cac_number` (String, required)
- `sector` (String, required, enum)
- `msme_strata` (String, required, enum: 'nano', 'micro', 'small', 'medium')
- `location` (Object, required)
  - `state` (String)
  - `lga` (String)
- `year_established` (Number, required)
- `employee_count` (Number, required)
- `revenue_band` (String, required, enum)
- `business_description` (String, required, max 1000 chars)
- `website` (String, optional)
- `social_media` (Object, optional)
  - `facebook` (String)
  - `twitter` (String)
  - `linkedin` (String)
  - `instagram` (String)

#### Application Details
- `category` (String, required, enum)
- `workflow_stage` (String, required, enum: 'submitted', 'pre_screening', 'under_review', 'shortlisted', 'finalist', 'winner', 'rejected')
- `key_achievements` (String, required, max 300 chars)
- `products_services_description` (String, required)

#### Impact Metrics
- `jobs_created` (Number, required, min 0)
- `women_youth_percentage` (Number, required, min 0, max 100)
- `export_activity` (Object, required)
  - `has_exports` (Boolean, required)
  - `export_details` (String, optional)
- `sustainability_initiatives` (Object, required)
  - `has_initiatives` (Boolean, required)
  - `initiative_details` (String, optional)
- `award_usage_plans` (String, required)

#### Media & Documents
- `pitch_video` (Object, required)
  - `url` (String, required)
  - `is_youtube_link` (Boolean, default false)
  - `youtube_vimeo_url` (String, optional)
  - `video_id` (String, optional)
  - `platform` (String, enum: 'youtube', 'vimeo')
- `documents` (Array of Document objects)
  - `filename` (String, required)
  - `original_name` (String, required)
  - `url` (String, required)
  - `cloudinary_id` (String, required)
  - `document_type` (String, required, enum)
  - `size` (Number, required)
  - `mime_type` (String, required)
  - `uploaded_at` (Date, default now)

#### Scoring & Judging
- `scores` (Array of Score objects)
- `total_score` (Number, default 0)
- `average_score` (Number, default 0)

#### Timeline
- `submission_date` (Date, optional)
- `review_start_date` (Date, optional)
- `review_completion_date` (Date, optional)
- `shortlist_date` (Date, optional)
- `winner_announcement_date` (Date, optional)

## API Endpoints

### GET /api/user/application-details

**Response Structure:**
```json
{
  "success": true,
  "message": "Complete application details retrieved successfully",
  "data": {
    "application_id": "string",
    "business_name": "string",
    "category": "string",
    "workflow_stage": "string",
    "created_at": "ISO date",
    "updated_at": "ISO date",
    
    "user": {
      "user_id": "string",
      "first_name": "string",
      "last_name": "string",
      "email": "string",
      "phone": "string"
    },
    
    "business_profile": null, // BusinessProfile model (separate from Application)
    
         "application_details": {
       // Core application fields
       "key_achievements": "string",
       "products_services_description": "string",
       "jobs_created": "number",
       "women_youth_percentage": "number",
       "export_activity": {
         "has_exports": "boolean",
         "export_details": "string"
       },
       "sustainability_initiatives": {
         "has_initiatives": "boolean",
         "initiative_details": "string"
       },
       "award_usage_plans": "string",
       
       // Business details (stored in Application model)
       "business_description": "string",
       "cac_number": "string",
       "sector": "string",
       "msme_strata": "string",
       "location": {
         "state": "string",
         "lga": "string"
       },
       "year_established": "number",
       "employee_count": "number",
       "revenue_band": "string",
       "website": "string",
       "social_media": {
         "facebook": "string",
         "twitter": "string",
         "linkedin": "string",
         "instagram": "string"
       }
     },
     
     // Additional application fields
     "total_score": "number",
     "average_score": "number",
     "pre_screening": {
       "passed": "boolean",
       "checked_by": "string",
       "checked_at": "ISO date",
       "notes": "string",
       "issues": ["string"]
     },
     "submission_date": "ISO date",
     "review_start_date": "ISO date",
     "review_completion_date": "ISO date",
     "shortlist_date": "ISO date",
     "winner_announcement_date": "ISO date",
    
    "documents": [
      {
        "filename": "string",
        "original_name": "string",
        "url": "string",
        "cloudinary_id": "string",
        "document_type": "string",
        "size": "number",
        "mime_type": "string",
        "uploaded_at": "ISO date",
        "_id": "string"
      }
    ],
    "documents_count": "number",
    
    "pitch_video": {
      "url": "string",
      "platform": "string",
      "is_youtube_link": "boolean"
    },
    "has_pitch_video": "boolean",
    
    "scores": [],
    "has_scores": "boolean",
    
    "status_summary": {
      "status": "string",
      "description": "string",
      "color": "string",
      "can_edit": "boolean"
    },
    
    "metadata": {
      "is_complete": "boolean",
      "can_edit": "boolean",
      "last_modified": "ISO date",
      "days_since_submission": "number"
    }
  }
}
```

## Frontend Payload Structure

### POST /api/applications/complete

**Expected FormData Structure:**
```
business_name: "string"
cac_number: "string"
sector: "string"
msme_strata: "string"
location[state]: "string"
location[lga]: "string"
year_established: "number"
employee_count: "number"
revenue_band: "string"
business_description: "string"
website: "string" (optional)
social_media[facebook]: "string" (optional)
social_media[twitter]: "string" (optional)
social_media[linkedin]: "string" (optional)
social_media[instagram]: "string" (optional)

category: "string"
key_achievements: "string"
products_services_description: "string"
jobs_created: "number"
women_youth_percentage: "number"
export_activity[has_exports]: "boolean" or "string" ("true"/"false")
export_activity[export_details]: "string"
sustainability_initiatives[has_initiatives]: "boolean" or "string" ("true"/"false")
sustainability_initiatives[initiative_details]: "string"
award_usage_plans: "string"

pitch_video: "string" (JSON stringified object) OR
pitch_video[url]: "string"
pitch_video[platform]: "string"

// File uploads
cac_certificate: File
product_photos: File (max 5)
business_plan: File (optional)
financial_statements: File (optional)
tax_clearance: File (optional) OR tax_identification: File (optional) // Both field names supported
insurance_certificate: File (optional)
quality_certification: File (optional)
export_license: File (optional)
```

## Important Notes

1. **Business Profile vs Application**: The `business_profile` field in the API response comes from a separate `BusinessProfile` model, not from the Application model.

2. **Missing Fields**: The following fields are NOT stored in the Application model and should NOT be expected in the API response:
   - `target_market`
   - `competitive_advantage`
   - `business_model`
   - `revenue_streams`
   - `growth_plans`
   - `funding_requirements`
   - `team_structure`
   - `challenges_faced`
   - `solutions_implemented`
   - `impact_measurement`
   - `innovation_technology`
   - `social_impact`
   - `future_vision`

3. **Boolean Fields**: The frontend can send boolean fields as either actual booleans or strings ("true"/"false"). The backend handles both formats.

4. **Nested Objects**: Use bracket notation for nested objects in FormData (e.g., `location[state]`, `export_activity[has_exports]`).

5. **File Uploads**: Files are uploaded via FormData and processed by multer with Cloudinary storage.

6. **Pitch Video**: Can be sent as either a JSON stringified object or as flattened fields with bracket notation.

7. **Field Name Flexibility**: The backend accepts both `tax_clearance` and `tax_identification` field names for tax-related documents. Both are treated as the same document type internally.
