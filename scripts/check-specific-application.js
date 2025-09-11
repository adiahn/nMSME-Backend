const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function checkSpecificApplication() {
  try {
    console.log('🔍 CHECKING SPECIFIC APPLICATION\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Score = require('../models/Score');
    const Judge = require('../models/Judge');
    const User = require('../models/User');
    const ApplicationLock = require('../models/ApplicationLock');

    // Check the specific application
    const applicationId = '68be9c5c4ab9a33350ee8e88';
    const application = await Application.findById(applicationId)
      .populate('user_id', 'first_name last_name email');

    if (!application) {
      console.log('❌ Application not found with ID:', applicationId);
      
      // Let's search for applications with "communication" in the name
      console.log('\n🔍 Searching for applications with "communication"...');
      const communicationApps = await Application.find({
        business_name: { $regex: /communication/i }
      }).populate('user_id', 'first_name last_name email');

      if (communicationApps.length > 0) {
        console.log(`\n📋 Found ${communicationApps.length} applications with "communication":`);
        communicationApps.forEach((app, index) => {
          console.log(`\n${index + 1}. ${app.business_name}`);
          console.log(`   ID: ${app._id}`);
          console.log(`   Sector: ${app.sector}`);
          console.log(`   Stage: ${app.workflow_stage}`);
          console.log(`   Created: ${app.createdAt.toLocaleString()}`);
        });
      }
      return;
    }

    console.log('📋 APPLICATION FOUND:');
    console.log(`   ID: ${application._id}`);
    console.log(`   Business Name: ${application.business_name}`);
    console.log(`   Sector: ${application.sector}`);
    console.log(`   Category: ${application.category}`);
    console.log(`   Workflow Stage: ${application.workflow_stage}`);
    console.log(`   Status: ${application.status}`);
    console.log(`   Applicant: ${application.user_id.first_name} ${application.user_id.last_name}`);
    console.log(`   Email: ${application.user_id.email}\n`);

    // Check for scores
    const scores = await Score.find({ application_id: applicationId });
    console.log('📊 EXISTING SCORES:');
    if (scores.length === 0) {
      console.log('   No scores found');
    } else {
      scores.forEach((score, index) => {
        console.log(`   Score ${index + 1}: ${score.total_score}/100`);
        console.log(`   Scored at: ${score.scored_at.toLocaleString()}`);
      });
    }

    // Check for locks
    const locks = await ApplicationLock.find({ application_id: applicationId });
    console.log('\n🔒 EXISTING LOCKS:');
    if (locks.length === 0) {
      console.log('   No locks found');
    } else {
      locks.forEach((lock, index) => {
        console.log(`   Lock ${index + 1}: Active: ${lock.is_active}, Expires: ${lock.expires_at.toLocaleString()}`);
      });
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

checkSpecificApplication();
