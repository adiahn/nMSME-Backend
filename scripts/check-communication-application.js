const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function checkCommunicationApplication() {
  try {
    console.log('🔍 CHECKING COMMUNICATION APPLICATION SCORING\n');
    
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

    // Search for "communication" application (case insensitive)
    const communicationApp = await Application.findOne({ 
      business_name: { $regex: /communication/i } 
    }).populate('user_id', 'first_name last_name email');

    if (!communicationApp) {
      console.log('❌ No application found with "communication" in the business name');
      
      // Let's search more broadly
      console.log('\n🔍 Searching for applications with "communication" in any field...');
      const broadSearch = await Application.find({
        $or: [
          { business_name: { $regex: /communication/i } },
          { business_description: { $regex: /communication/i } },
          { products_services_description: { $regex: /communication/i } }
        ]
      }).populate('user_id', 'first_name last_name email');

      if (broadSearch.length > 0) {
        console.log(`\n📋 Found ${broadSearch.length} applications with "communication" in any field:`);
        broadSearch.forEach((app, index) => {
          console.log(`\n${index + 1}. ${app.business_name}`);
          console.log(`   ID: ${app._id}`);
          console.log(`   Sector: ${app.sector}`);
          console.log(`   Category: ${app.category}`);
          console.log(`   Stage: ${app.workflow_stage}`);
          console.log(`   Created: ${app.createdAt.toLocaleString()}`);
        });
      } else {
        console.log('❌ No applications found with "communication" in any field');
      }
      return;
    }

    console.log('📋 COMMUNICATION APPLICATION FOUND:');
    console.log(`   Business Name: ${communicationApp.business_name}`);
    console.log(`   ID: ${communicationApp._id}`);
    console.log(`   Sector: ${communicationApp.sector}`);
    console.log(`   Category: ${communicationApp.category}`);
    console.log(`   MSME Strata: ${communicationApp.msme_strata}`);
    console.log(`   Workflow Stage: ${communicationApp.workflow_stage}`);
    console.log(`   Status: ${communicationApp.status}`);
    console.log(`   Created: ${communicationApp.createdAt.toLocaleString()}`);
    console.log(`   Applicant: ${communicationApp.user_id.first_name} ${communicationApp.user_id.last_name}`);
    console.log(`   Email: ${communicationApp.user_id.email}\n`);

    // Check for scores
    console.log('🎯 CHECKING SCORES:');
    const scores = await Score.find({ 
      application_id: communicationApp._id 
    }).populate('judge_id', 'user_id').populate('judge_id.user_id', 'first_name last_name');

    if (scores.length === 0) {
      console.log('❌ No scores found for this application');
    } else {
      console.log(`✅ Found ${scores.length} score(s) for this application:\n`);
      
      scores.forEach((score, index) => {
        console.log(`📊 Score ${index + 1}:`);
        console.log(`   Judge: ${score.judge_id.user_id.first_name} ${score.judge_id.user_id.last_name}`);
        console.log(`   Total Score: ${score.total_score}/100`);
        console.log(`   Grade: ${score.grade || 'Not calculated'}`);
        console.log(`   Scored At: ${score.scored_at.toLocaleString()}`);
        console.log(`   Time Spent: ${score.time_spent_minutes || 'N/A'} minutes`);
        
        console.log(`   Criteria Scores:`);
        console.log(`     Business Viability & Financial Health: ${score.business_viability_financial_health}/25`);
        console.log(`     Market Opportunity & Traction: ${score.market_opportunity_traction}/20`);
        console.log(`     Social Impact & Job Creation: ${score.social_impact_job_creation}/20`);
        console.log(`     Innovation & Technology Adoption: ${score.innovation_technology_adoption}/15`);
        console.log(`     Sustainability & Environmental Impact: ${score.sustainability_environmental_impact}/10`);
        console.log(`     Management & Leadership: ${score.management_leadership}/10`);
        
        if (score.comments) {
          console.log(`   Comments: ${score.comments}`);
        }
        if (score.review_notes) {
          console.log(`   Review Notes: ${score.review_notes}`);
        }
        console.log('');
      });
    }

    // Check for locks
    console.log('🔒 CHECKING LOCKS:');
    const locks = await ApplicationLock.find({ 
      application_id: communicationApp._id 
    }).populate('judge_id', 'user_id').populate('judge_id.user_id', 'first_name last_name');

    if (locks.length === 0) {
      console.log('❌ No locks found for this application');
    } else {
      console.log(`✅ Found ${locks.length} lock(s) for this application:\n`);
      
      locks.forEach((lock, index) => {
        console.log(`🔒 Lock ${index + 1}:`);
        console.log(`   Judge: ${lock.judge_id.user_id.first_name} ${lock.judge_id.user_id.last_name}`);
        console.log(`   Lock Type: ${lock.lock_type}`);
        console.log(`   Locked At: ${lock.locked_at.toLocaleString()}`);
        console.log(`   Expires At: ${lock.expires_at.toLocaleString()}`);
        console.log(`   Is Active: ${lock.is_active}`);
        console.log(`   Session ID: ${lock.session_id}`);
        console.log('');
      });
    }

    // Check application assignments
    console.log('👥 CHECKING ASSIGNMENTS:');
    const ApplicationAssignment = require('../models/ApplicationAssignment');
    const assignments = await ApplicationAssignment.find({ 
      application_id: communicationApp._id 
    }).populate('judge_id', 'user_id').populate('judge_id.user_id', 'first_name last_name');

    if (assignments.length === 0) {
      console.log('❌ No assignments found for this application');
    } else {
      console.log(`✅ Found ${assignments.length} assignment(s) for this application:\n`);
      
      assignments.forEach((assignment, index) => {
        console.log(`👥 Assignment ${index + 1}:`);
        console.log(`   Judge: ${assignment.judge_id.user_id.first_name} ${assignment.judge_id.user_id.last_name}`);
        console.log(`   Status: ${assignment.status}`);
        console.log(`   Assigned At: ${assignment.assigned_at.toLocaleString()}`);
        if (assignment.reviewed_at) {
          console.log(`   Reviewed At: ${assignment.reviewed_at.toLocaleString()}`);
        }
        console.log(`   Time Spent: ${assignment.time_spent_minutes || 'N/A'} minutes`);
        console.log('');
      });
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`   Application: ${communicationApp.business_name}`);
    console.log(`   Scores: ${scores.length}`);
    console.log(`   Locks: ${locks.length}`);
    console.log(`   Assignments: ${assignments.length}`);
    console.log(`   Workflow Stage: ${communicationApp.workflow_stage}`);
    
    if (scores.length > 0) {
      const averageScore = scores.reduce((sum, score) => sum + score.total_score, 0) / scores.length;
      console.log(`   Average Score: ${averageScore.toFixed(2)}/100`);
      console.log(`   Latest Score: ${scores[0].total_score}/100 (${scores[0].grade || 'N/A'})`);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

checkCommunicationApplication();
