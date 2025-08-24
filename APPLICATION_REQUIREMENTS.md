# nMSME Awards Portal - Complete Application Requirements (Updated to Match PRD)

## 📋 Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Authentication System](#authentication-system)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [File Upload System](#file-upload-system)
7. [Email System](#email-system)
8. [Frontend Integration](#frontend-integration)
9. [Configuration Requirements](#configuration-requirements)
10. [Security Features](#security-features)
11. [Testing Requirements](#testing-requirements)
12. [Deployment Guide](#deployment-guide)

## 🎯 Overview

The nMSME Awards Portal is a comprehensive awards management system that allows MSMEs to register, submit applications, and participate in various award categories. The system supports multiple user roles including applicants, judges, admins, and sponsors.

### Key Features
- **Multi-step OTP Registration**: Secure 3-step registration process
- **Document Management**: Cloudinary-based file upload system with mandatory video pitch
- **Application Management**: Complete application lifecycle with 4-stage workflow
- **Judging System**: Expert-based application evaluation with 6-criteria scoring rubric
- **Email Notifications**: SendGrid-powered email system
- **Role-based Access**: Multiple user roles and permissions

## 🏗️ System Architecture

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary
- **Email Service**: SendGrid
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

### Project Structure
```
nMSME-Backend/
├── models/           # Database schemas
├── routes/           # API endpoints
├── middleware/       # Custom middleware
├── utils/           # Utility functions
├── config.env       # Environment variables
└── server.js        # Main application file
```

## 🔐 Authentication System

### Registration Process (3-Step OTP)

#### Step 1: Send OTP
```http
POST /api/auth/register/step1
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+2348012345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your email",
  "data": {
    "user_id": "user_id_here",
    "expires_in": 600
  }
}
```

#### Step 2: Verify OTP
```http
POST /api/auth/register/step2
Content-Type: application/json

{
  "user_id": "user_id_here",
  "otp": "123456"
}
```

#### Step 3: Complete Registration
```http
POST /api/auth/register/step3
Content-Type: application/json

{
  "user_id": "user_id_here",
  "password": "secure_password",
  "role": "applicant"
}
```

### Login System
```http
POST /api/auth/login
Content-Type: application/json

{
  "email_or_phone": "john.doe@example.com", // or phone number
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "role": "applicant"
  }
}
```

## 📡 API Endpoints

### Authentication Endpoints
- `POST /api/auth/register/step1` - Send OTP
- `POST /api/auth/register/step2` - Verify OTP
- `POST /api/auth/register/step3` - Complete registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email address

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/application-stats` - Get application statistics

### Business Profile
- `POST /api/business-profile` - Create business profile
- `GET /api/business-profile/:id` - Get business profile
- `PUT /api/business-profile/:id` - Update business profile
- `GET /api/business-profile/user/profile` - Get user's business profile
- `GET /api/business-profile/sector/:sector` - Get profiles by sector
- `GET /api/business-profile/strata/:strata` - Get profiles by MSME strata

### Applications
- `POST /api/applications` - Create application
- `GET /api/applications` - List applications
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application
- `POST /api/applications/:id/submit` - Submit application
- `GET /api/applications/:id/timeline` - Get application timeline
- `GET /api/applications/:id/validation` - Get validation status

### Document Management
- `POST /api/documents/upload/:applicationId` - Upload documents
- `POST /api/documents/upload-video-link/:applicationId` - Upload video link
- `GET /api/documents/:applicationId` - Get application documents
- `DELETE /api/documents/:documentId` - Delete document
- `DELETE /api/documents/video/:applicationId` - Delete pitch video

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get category details
- `GET /api/categories/msme-strata` - Get MSME strata definitions

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-applications` - Get recent applications
- `GET /api/dashboard/pending-reviews` - Get pending reviews

### Judge Management
- `GET /api/judge/assignments` - Get judge assignments
- `POST /api/judge/score/:applicationId` - Submit application score
- `GET /api/judge/applications` - Get assigned applications

### Admin Management
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/applications` - List all applications
- `POST /api/admin/judges` - Assign judges
- `GET /api/admin/reports` - Generate reports

### Public Endpoints
- `GET /api/public/categories` - Public categories list
- `GET /api/public/winners` - Public winners announcement
- `GET /api/public/application/:trackingId` - Track application status

## 📊 Data Models

### User Model
```javascript
{
  first_name: String (required),
  last_name: String (required),
  email: String (required, unique),
  phone: String (required, unique),
  password_hash: String (required),
  gender: String (enum: ['male', 'female', 'other']),
  age_band: String (enum: ['18-25', '26-35', '36-45', '46-55', '55+']),
  role: String (enum: ['applicant', 'judge', 'admin', 'sponsor', 'public']),
  is_verified: Boolean (default: false),
  is_active: Boolean (default: true),
  last_login: Date,
  // OTP fields
  otp_code: String,
  otp_expires: Date,
  otp_verified: Boolean,
  registration_step: Number (1-3)
}
```

### Business Profile Model (Updated to Match PRD)
```javascript
{
  user_id: ObjectId (required),
  business_name: String (required),
  cac_number: String (required, unique),
  sector: String (required, enum: [
    'Fashion',
    'Information Technology (IT)',
    'Agribusiness',
    'Food & Beverage',
    'Light Manufacturing',
    'Creative Enterprise',
    'Emerging Enterprise Award'
  ]),
  msme_strata: String (required, enum: ['nano', 'micro', 'small', 'medium']),
  location: {
    state: String (required),
    lga: String (required)
  },
  year_established: Number (required),
  employee_count: Number (required),
  revenue_band: String (required, enum: [
    'Less than ₦100,000/month',
    '₦100,000 - ₦500,000/month',
    '₦500,000 - ₦1,000,000/month',
    '₦1,000,000 - ₦5,000,000/month',
    '₦5,000,000 - ₦10,000,000/month',
    'Above ₦10,000,000/month'
  ]),
  business_description: String (required, max: 500),
  key_achievements: String (required, max: 300),
  products_services: String (required),
  market_reach: String (required, enum: ['local', 'regional', 'national', 'international']),
  website: String,
  social_media: {
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String
  },
  jobs_created: Number (required),
  women_youth_percentage: Number (required, 0-100),
  export_activity: {
    has_exports: Boolean (required),
    export_details: String
  },
  sustainability_initiatives: {
    has_initiatives: Boolean (required),
    initiative_details: String
  },
  award_usage_plans: String (required)
}
```

### Application Model (Updated to Match PRD)
```javascript
{
  user_id: ObjectId (required),
  business_profile_id: ObjectId (required),
  category: String (required, enum: [
    'Fashion',
    'Information Technology (IT)',
    'Agribusiness',
    'Food & Beverage',
    'Light Manufacturing',
    'Creative Enterprise',
    'Emerging Enterprise Award'
  ]),
  workflow_stage: String (required, enum: [
    'draft',           // Stage 1: Registration & Profile Setup
    'submitted',       // Stage 2: Application Form completed
    'pre_screening',   // Stage 3: Pre-Screening & Verification
    'under_review',    // Stage 4: Judging
    'shortlisted',     // Stage 5: Shortlisting
    'finalist',        // Stage 6: Winner Selection
    'winner',          // Final winner
    'rejected'         // Rejected at any stage
  ]),
  // Application form fields from PRD
  business_overview: String (required, max: 500),
  key_achievements: String (required, max: 300),
  products_services_description: String (required),
  market_reach: String (required, enum: ['local', 'regional', 'national', 'international']),
  // Impact metrics from PRD
  jobs_created: Number (required),
  women_youth_percentage: Number (required, 0-100),
  export_activity: {
    has_exports: Boolean (required),
    export_details: String
  },
  sustainability_initiatives: {
    has_initiatives: Boolean (required),
    initiative_details: String
  },
  award_usage_plans: String (required),
  // Documents from PRD
  documents: [{
    filename: String,
    original_name: String,
    url: String,
    cloudinary_id: String,
    document_type: String (enum: [
      'cac_certificate',      // Mandatory from PRD
      'tax_identification',   // Optional from PRD
      'product_photos',       // Max 5 photos from PRD
      'pitch_video',          // Mandatory 2-3 min video from PRD
      'business_plan',        // Optional
      'financial_statements', // Optional
      'other'                 // Other supporting documents
    ]),
    size: Number,
    mime_type: String
  }],
  // Mandatory video pitch from PRD
  pitch_video: {
    url: String (required),
    is_youtube_link: Boolean,
    youtube_vimeo_url: String,
    video_id: String, // Extract video ID from URL
    platform: String (enum: ['youtube', 'vimeo'], required)
  },
  // Scoring and judging with 6-criteria rubric from PRD
  scores: [{
    judge_id: ObjectId,
    innovation_differentiation: { score: Number (0-20), comments: String },
    market_traction_growth: { score: Number (0-20), comments: String },
    impact_job_creation: { score: Number (0-25), comments: String },
    financial_health_governance: { score: Number (0-15), comments: String },
    inclusion_sustainability: { score: Number (0-10), comments: String },
    scalability_award_use: { score: Number (0-10), comments: String },
    total_score: Number (0-100),
    date: Date
  }],
  total_score: Number,
  average_score: Number,
  // Pre-screening results
  pre_screening: {
    passed: Boolean,
    checked_by: ObjectId,
    checked_at: Date,
    notes: String,
    issues: [String]
  },
  // Application timeline
  submission_date: Date,
  review_start_date: Date,
  review_completion_date: Date,
  shortlist_date: Date,
  winner_announcement_date: Date
}
```

### Judge Model
```javascript
{
  user_id: ObjectId (required),
  expertise_areas: [String] (required),
  experience_years: Number,
  bio: String,
  is_active: Boolean (default: true),
  max_applications: Number (default: 10),
  current_assignments: Number (default: 0)
}
```

### Application Assignment Model
```javascript
{
  application_id: ObjectId (required),
  judge_id: ObjectId (required),
  assigned_date: Date,
  due_date: Date,
  status: String (enum: ['assigned', 'in_progress', 'completed']),
  score: Number,
  comments: String,
  completed_date: Date
}
```

## 📁 File Upload System

### Cloudinary Integration
- **Cloud Name**: `dyyhuoozp`
- **Storage Folder**: `nmsme-awards`
- **File Transformations**: Images resized to max 1000x1000

### Supported File Types
- **Images**: JPG, JPEG, PNG
- **Documents**: PDF
- **Videos**: MP4, AVI, MOV
- **Max File Size**: 200MB
- **Max Files Per Upload**: 10

### Document Types (Updated to Match PRD)
```javascript
[
  'cac_certificate',      // Mandatory from PRD
  'tax_identification',   // Optional from PRD
  'product_photos',       // Max 5 photos from PRD
  'business_plan',        // Optional
  'financial_statements', // Optional
  'other'                 // Other supporting documents
]
```

### Upload Process
1. **Frontend**: Send files via `multipart/form-data`
2. **Backend**: Upload to Cloudinary automatically
3. **Response**: Return Cloudinary URLs and metadata

### File Response Format
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "_id": "document_id",
        "filename": "cac_certificate.pdf",
        "original_name": "cac_certificate.pdf",
        "url": "https://res.cloudinary.com/dyyhuoozp/...",
        "cloudinary_id": "nmsme-awards/...",
        "document_type": "cac_certificate",
        "size": 1024000,
        "mime_type": "application/pdf"
      }
    ]
  }
}
```

### Video Pitch Requirements (Mandatory from PRD)
- **Format**: YouTube or Vimeo link only
- **Duration**: 2-3 minutes (recommended)
- **Validation**: Must be valid YouTube or Vimeo URL
- **Upload Endpoint**: `POST /api/documents/upload-video-link/:applicationId`
- **Note**: No file uploads accepted - only video platform links

## 📧 Email System

### SendGrid Configuration
- **API Key**: Configured in environment
- **Sender Email**: `velixifyltd@gmail.com`
- **Display Name**: "nMSME Awards Portal"

### Email Types
1. **OTP Emails**: Registration verification
2. **Welcome Emails**: Account confirmation
3. **Application Status**: Status updates
4. **Password Reset**: Security emails
5. **Judge Notifications**: Assignment notifications

### Email Templates
All emails use professional HTML templates with:
- nMSME branding
- Responsive design
- Clear call-to-action buttons
- Professional styling

## 🎨 Frontend Integration

### No Code Changes Required
The frontend can continue using existing API endpoints without modifications.

### File Upload Implementation
```javascript
// Example frontend code for document upload
const formData = new FormData();
formData.append('documents', file);
formData.append('document_type', 'cac_certificate');

const response = await fetch('/api/documents/upload/applicationId', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
// Use result.data.documents[0].url for display
```

### Video Pitch Upload
```javascript
// For YouTube/Vimeo link only
const response = await fetch('/api/documents/upload-video-link/applicationId', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    video_url: 'https://www.youtube.com/watch?v=...' // or Vimeo URL
  })
});

// Response will include video_id and platform
const result = await response.json();
// result.data.pitch_video contains: url, video_id, platform, etc.
```

### Authentication Flow
```javascript
// Step 1: Send OTP
const step1Response = await fetch('/api/auth/register/step1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+2348012345678'
  })
});

// Step 2: Verify OTP
const step2Response = await fetch('/api/auth/register/step2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: step1Response.data.user_id,
    otp: '123456'
  })
});

// Step 3: Complete registration
const step3Response = await fetch('/api/auth/register/step3', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: step1Response.data.user_id,
    password: 'secure_password'
  })
});
```

### Application Workflow
```javascript
// Create application
const createResponse = await fetch('/api/applications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    business_profile_id: 'profile_id',
    category: 'Fashion',
    business_overview: '...',
    key_achievements: '...',
    // ... other required fields
  })
});

// Submit application
const submitResponse = await fetch(`/api/applications/${applicationId}/submit`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Check validation status
const validationResponse = await fetch(`/api/applications/${applicationId}/validation`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Error Handling
```javascript
// Handle API errors
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || 'Something went wrong');
}
```

## ⚙️ Configuration Requirements

### Environment Variables
```bash
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=nmsme_awards

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dyyhuoozp
CLOUDINARY_API_KEY=286953625321724
CLOUDINARY_API_SECRET=2dY8fS9KmbFSbBRc0QFyx2saMsQ

# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_HOST=smtp.sendgrid.net
SENDGRID_PORT=587
SENDGRID_USERNAME=apikey
SENDGRID_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=velixifyltd@gmail.com

# Application Configuration
APP_NAME=nMSME Awards Portal
APP_URL=http://localhost:3000
API_URL=http://localhost:5000

# File Upload Limits
MAX_FILE_SIZE=209715200
MAX_FILES_PER_UPLOAD=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
```

### Required Services
1. **MongoDB Atlas**: Database hosting
2. **Cloudinary**: File storage and CDN
3. **SendGrid**: Email delivery service
4. **Domain/SSL**: For production deployment

## 🔒 Security Features

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt with 12 rounds
- **OTP Verification**: 6-digit codes with 10-minute expiry
- **Rate Limiting**: Prevents brute force attacks

### Data Security
- **Input Validation**: express-validator for all inputs
- **SQL Injection Protection**: MongoDB with parameterized queries
- **XSS Protection**: Helmet middleware
- **CORS Configuration**: Proper cross-origin settings

### File Security
- **File Type Validation**: Whitelist of allowed file types
- **Size Limits**: Maximum file size restrictions
- **Virus Scanning**: Cloudinary provides security scanning
- **Secure URLs**: Time-limited access tokens

### API Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Authentication Required**: Protected routes
- **Role-based Access**: Different permissions per user role
- **Request Validation**: All inputs validated

## 🧪 Testing Requirements

### Unit Tests
- Authentication flows
- Data validation
- Business logic
- Error handling

### Integration Tests
- API endpoints
- Database operations
- File upload/download
- Email sending

### Security Tests
- Authentication bypass attempts
- SQL injection attempts
- File upload security
- Rate limiting

### Performance Tests
- API response times
- File upload performance
- Database query optimization
- Concurrent user handling

## 🚀 Deployment Guide

### Production Environment
1. **Environment Variables**: Set all production values
2. **Database**: MongoDB Atlas production cluster
3. **File Storage**: Cloudinary production account
4. **Email Service**: SendGrid production account
5. **Domain**: Configure custom domain with SSL

### Deployment Steps
1. **Code Repository**: Push to production branch
2. **Environment Setup**: Configure production environment variables
3. **Database Migration**: Run any necessary migrations
4. **Service Deployment**: Deploy to hosting platform
5. **SSL Certificate**: Install SSL certificate
6. **Monitoring**: Set up application monitoring
7. **Backup**: Configure automated backups

### Hosting Recommendations
- **Platform**: Heroku, AWS, DigitalOcean, or similar
- **Process Manager**: PM2 for Node.js applications
- **Reverse Proxy**: Nginx for load balancing
- **Monitoring**: Application performance monitoring
- **Logging**: Centralized logging system

### Performance Optimization
- **Caching**: Redis for session and data caching
- **CDN**: Cloudinary provides global CDN
- **Database Indexing**: Optimize MongoDB queries
- **Image Optimization**: Automatic image compression
- **Code Minification**: Minify production code

## 📞 Support & Maintenance

### Monitoring
- **Application Health**: Regular health checks
- **Error Tracking**: Monitor and log errors
- **Performance Metrics**: Track response times
- **User Analytics**: Monitor user behavior

### Backup Strategy
- **Database Backups**: Daily automated backups
- **File Backups**: Cloudinary provides redundancy
- **Code Backups**: Version control with Git
- **Configuration Backups**: Environment variable backups

### Update Process
1. **Development**: Test in development environment
2. **Staging**: Deploy to staging environment
3. **Testing**: Comprehensive testing in staging
4. **Production**: Deploy to production with rollback plan
5. **Monitoring**: Monitor for issues post-deployment

---

## 📋 Checklist for Implementation

### Backend Setup
- [ ] Environment variables configured
- [ ] Database connection established
- [ ] Cloudinary integration working
- [ ] SendGrid email service configured
- [ ] All API endpoints tested
- [ ] Security measures implemented
- [ ] Error handling in place

### Frontend Integration
- [ ] Authentication flow implemented
- [ ] File upload functionality working
- [ ] Video pitch upload working
- [ ] API error handling implemented
- [ ] User interface responsive
- [ ] Form validation working
- [ ] Loading states implemented

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests completed
- [ ] Security tests performed
- [ ] Performance tests conducted
- [ ] User acceptance testing done

### Deployment
- [ ] Production environment configured
- [ ] SSL certificate installed
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Documentation completed

---

## 🎯 Key Changes Made to Match PRD

### ✅ Categories Updated
- **Fashion**
- **Information Technology (IT)**
- **Agribusiness**
- **Food & Beverage**
- **Light Manufacturing**
- **Creative Enterprise**
- **Emerging Enterprise Award** (Special Nano Category)

### ✅ MSME Strata Implemented
- **Nano**: 1-2 Staff or Sales < ₦100,000/month
- **Micro**: 3-9 Staff or Assets ₦500k-₦2.5m
- **Small**: 10-50 Staff or Assets ₦2.5m-₦50m
- **Medium**: 51-199 Staff or Assets ₦50m-₦500m

### ✅ Application Workflow Stages
1. **Draft**: Registration & Profile Setup
2. **Submitted**: Application Form completed
3. **Pre-Screening**: Pre-Screening & Verification
4. **Under Review**: Judging
5. **Shortlisted**: Shortlisting
6. **Finalist**: Winner Selection
7. **Winner**: Final winner
8. **Rejected**: Rejected at any stage

### ✅ Mandatory Documents
- **CAC Certificate** (PDF)
- **Pitch Video** (2-3 min, MP4/AVI/MOV or YouTube/Vimeo link)
- **Product Photos** (1-5 images, JPG/PNG)

### ✅ Scoring Rubric (6 Criteria)
- **Innovation & Differentiation**: 20%
- **Market Traction & Growth**: 20%
- **Impact & Job Creation**: 25%
- **Financial Health & Governance**: 15%
- **Inclusion & Sustainability**: 10%
- **Scalability & Award Use**: 10%

### ✅ New Application Fields
- Business overview (500 words max)
- Key achievements (300 words max)
- Products/services description
- Market reach (local/regional/national/international)
- Jobs created
- Women/youth percentage
- Export activity (Y/N + details)
- Sustainability initiatives (Y/N + details)
- Award usage plans

**This document provides a comprehensive guide for implementing the nMSME Awards Portal that exactly matches the original PRD requirements. All systems are designed to work together seamlessly while maintaining security, performance, and scalability.**
