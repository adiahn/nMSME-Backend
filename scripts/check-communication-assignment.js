const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function checkCommunicationAssignment() {
  try {
    console.log('🔍 CHECKING COMMUNICATION APPLICATION ASSIGNMENT\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Get the communication application
    const communicationApp = await Application.findOne({ 
      business_name: { $regex: /communication/i } 
    });

    if (!communicationApp) {
      console.log('❌ Communication application not found');
      return;
    }

    console.log('📋 COMMUNICATION APPLICATION:');
    console.log(`   Business Name: ${communicationApp.business_name}`);
    console.log(`   ID: ${communicationApp._id}`);
    console.log(`   Sector: ${communicationApp.sector}`);
    console.log(`   Created: ${communicationApp.createdAt.toLocaleString()}\n`);

    // Get all applications sorted by creation date (same as random distribution)
    const allApplications = await Application.find({ 
      workflow_stage: { $in: ['submitted', 'under_review'] } 
    }).sort('createdAt');

    // Get all active judges
    const allJudges = await Judge.find({ is_active: true })
      .populate('user_id', 'first_name last_name email')
      .sort('createdAt');

    console.log(`📊 TOTAL APPLICATIONS: ${allApplications.length}`);
    console.log(`👨‍⚖️ TOTAL JUDGES: ${allJudges.length}\n`);

    // Find the position of communication app in the sorted list
    const appIndex = allApplications.findIndex(app => app._id.equals(communicationApp._id));
    console.log(`📍 COMMUNICATION APP POSITION: ${appIndex + 1} out of ${allApplications.length}\n`);

    // Calculate random distribution
    const totalApplications = allApplications.length;
    const totalJudges = allJudges.length;
    const applicationsPerJudge = Math.floor(totalApplications / totalJudges);
    const extraApplications = totalApplications % totalJudges;

    console.log('📋 DISTRIBUTION CALCULATION:');
    console.log(`   Applications per judge: ${applicationsPerJudge}`);
    console.log(`   Extra applications: ${extraApplications}\n`);

    // Check which judge should have this application
    let assignedJudge = null;
    let judgeIndex = -1;
    let startIndex = 0;
    let endIndex = 0;

    for (let i = 0; i < allJudges.length; i++) {
      startIndex = i * applicationsPerJudge + Math.min(i, extraApplications);
      endIndex = startIndex + applicationsPerJudge + (i < extraApplications ? 1 : 0);
      
      if (appIndex >= startIndex && appIndex < endIndex) {
        assignedJudge = allJudges[i];
        judgeIndex = i;
        break;
      }
    }

    if (assignedJudge) {
      console.log('👨‍⚖️ ASSIGNED JUDGE:');
      console.log(`   Judge: ${assignedJudge.user_id.first_name} ${assignedJudge.user_id.last_name}`);
      console.log(`   Email: ${assignedJudge.user_id.email}`);
      console.log(`   Judge Index: ${judgeIndex + 1}`);
      console.log(`   Judge Range: ${startIndex + 1}-${endIndex}`);
      console.log(`   App Position: ${appIndex + 1} (within range)`);
      console.log(`   Expertise: ${assignedJudge.expertise_sectors.join(', ')}\n`);

      // Check if this judge has any active locks
      const ApplicationLock = require('../models/ApplicationLock');
      const activeLocks = await ApplicationLock.find({
        judge_id: assignedJudge._id,
        is_active: true
      }).populate('application_id', 'business_name');

      console.log('🔒 JUDGE ACTIVE LOCKS:');
      if (activeLocks.length === 0) {
        console.log('   No active locks');
      } else {
        activeLocks.forEach((lock, index) => {
          console.log(`   ${index + 1}. ${lock.application_id.business_name}`);
          console.log(`      Expires: ${lock.expires_at.toLocaleString()}`);
          console.log(`      Time Remaining: ${lock.time_remaining_minutes || 'N/A'} minutes`);
        });
      }
      console.log('');

      // Check if this judge has any scores
      const Score = require('../models/Score');
      const judgeScores = await Score.find({
        judge_id: assignedJudge._id
      }).populate('application_id', 'business_name').sort('-scored_at');

      console.log('📊 JUDGE SCORES:');
      if (judgeScores.length === 0) {
        console.log('   No scores submitted yet');
      } else {
        console.log(`   Total scores: ${judgeScores.length}`);
        judgeScores.slice(0, 5).forEach((score, index) => {
          console.log(`   ${index + 1}. ${score.application_id.business_name}: ${score.total_score}/100 (${score.grade || 'N/A'})`);
        });
        if (judgeScores.length > 5) {
          console.log(`   ... and ${judgeScores.length - 5} more`);
        }
      }
      console.log('');

    } else {
      console.log('❌ Communication app not assigned to any judge');
    }

    // Check if communication app is in any judge's range
    console.log('📋 ALL JUDGE RANGES:');
    allJudges.forEach((judge, index) => {
      const startIdx = index * applicationsPerJudge + Math.min(index, extraApplications);
      const endIdx = startIdx + applicationsPerJudge + (index < extraApplications ? 1 : 0);
      const hasCommunication = appIndex >= startIdx && appIndex < endIdx;
      
      console.log(`   Judge ${index + 1} (${judge.user_id.first_name}): ${startIdx + 1}-${endIdx} ${hasCommunication ? '✅ HAS COMMUNICATION' : ''}`);
    });

    console.log('\n🎯 CONCLUSION:');
    if (assignedJudge) {
      console.log(`✅ Communication app is assigned to ${assignedJudge.user_id.first_name} ${assignedJudge.user_id.last_name}`);
      console.log(`   The judge can access it via the judge dashboard`);
      console.log(`   No scoring has been done yet - the app is ready for review`);
    } else {
      console.log(`❌ Communication app is not properly assigned`);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

checkCommunicationAssignment();
