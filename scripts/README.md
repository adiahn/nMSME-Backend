# Scripts Directory

This directory contains various utility and testing scripts for the nMSME Awards Backend system.

## Script Categories

### Database Investigation Scripts
- **`check-applications.js`** - Check all applications in the database
- **`check-recent-apps.js`** - Check recently created applications
- **`check-users.js`** - Check all users in the database
- **`check-very-recent.js`** - Check very recent applications
- **`comprehensive-diagnostic.js`** - Comprehensive system diagnostic
- **`deep-database-investigation.js`** - Deep database investigation
- **`find-all-applications.js`** - Find and display all applications
- **`investigate-applications.js`** - Investigate application data
- **`simple-check-apps.js`** - Simple application check

### Creation Scripts
- **`create-judge.js`** - Create a new judge account
- **`create-super-admin.js`** - Create a super admin account
- **`create-test-application.js`** - Create a test application

### Debug Scripts
- **`debug-recent-submission.js`** - Debug recent application submissions

### Test Scripts
- **`test-admin-endpoint.js`** - Test admin endpoints
- **`test-api-directly.js`** - Test API endpoints directly
- **`test-api.js`** - General API testing
- **`test-application-locking.js`** - Test application locking system
- **`test-cloudinary.js`** - Test Cloudinary integration
- **`test-judge-login.js`** - Test judge login functionality
- **`test-sendgrid.js`** - Test SendGrid email service
- **`test-video-link.js`** - Test video link functionality

## Usage

Most scripts can be run directly with Node.js:

```bash
# From the project root
node scripts/script-name.js

# Or from the scripts directory
cd scripts
node script-name.js
```

## Prerequisites

- Node.js installed
- MongoDB connection configured
- Environment variables set up in `config.env`
- Dependencies installed (`npm install`)

## Notes

- Scripts are for development and testing purposes
- Some scripts may require specific environment setup
- Always check script contents before running in production
- Scripts may modify database data - use with caution

## Environment Variables

Make sure these are set in your `config.env`:
- `MONGODB_URI` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT secret key
- Other service-specific variables as needed
