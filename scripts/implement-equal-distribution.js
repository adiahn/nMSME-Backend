const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function implementEqualDistribution() {
  try {
    console.log('🎯 IMPLEMENTING EQUAL DISTRIBUTION SYSTEM\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Get all applications
    const allApplications = await Application.find({ workflow_stage: 'submitted' })
      .select('_id business_name category sector workflow_stage createdAt')
      .sort('createdAt'); // Sort by creation date for consistent distribution

    // Get all active judges
    const judges = await Judge.find({ is_active: true })
      .populate('user_id', 'first_name last_name email')
      .sort('createdAt'); // Sort by creation date for consistent assignment

    console.log(`📊 Total applications: ${allApplications.length}`);
    console.log(`👨‍⚖️ Total active judges: ${judges.length}\n`);

    if (judges.length === 0) {
      console.log('❌ No active judges found');
      return;
    }

    // Calculate equal distribution
    const applicationsPerJudge = Math.floor(allApplications.length / judges.length);
    const remainingApplications = allApplications.length % judges.length;

    console.log(`📋 Distribution plan:`);
    console.log(`   Base applications per judge: ${applicationsPerJudge}`);
    console.log(`   Extra applications to distribute: ${remainingApplications}\n`);

    // Distribute applications equally
    let currentIndex = 0;
    const distribution = {};

    judges.forEach((judge, judgeIndex) => {
      const judgeApplications = applicationsPerJudge + (judgeIndex < remainingApplications ? 1 : 0);
      const assignedApplications = allApplications.slice(currentIndex, currentIndex + judgeApplications);
      
      distribution[judge._id] = {
        judge: judge,
        applications: assignedApplications,
        count: assignedApplications.length
      };

      console.log(`👨‍⚖️ ${judge.user_id.first_name} ${judge.user_id.last_name}:`);
      console.log(`   Applications assigned: ${assignedApplications.length}`);
      console.log(`   Range: ${currentIndex + 1} to ${currentIndex + assignedApplications.length}`);
      
      // Show first few applications
      if (assignedApplications.length > 0) {
        console.log(`   Sample applications:`);
        assignedApplications.slice(0, 3).forEach((app, index) => {
          console.log(`     ${index + 1}. ${app.business_name} (${app.sector})`);
        });
        if (assignedApplications.length > 3) {
          console.log(`     ... and ${assignedApplications.length - 3} more`);
        }
      }
      console.log('');

      currentIndex += judgeApplications;
    });

    // Check if Velixify is included
    const velixifyApp = allApplications.find(app => 
      app.business_name.toLowerCase().includes('velixify')
    );

    if (velixifyApp) {
      console.log('🔍 VELIXIFY DISTRIBUTION CHECK:');
      const velixifyIndex = allApplications.findIndex(app => app._id.equals(velixifyApp._id));
      console.log(`   Velixify is at position ${velixifyIndex + 1} in the sorted list`);
      
      // Find which judge gets Velixify
      let assignedJudge = null;
      let currentPos = 0;
      
      for (const [judgeId, data] of Object.entries(distribution)) {
        if (velixifyIndex >= currentPos && velixifyIndex < currentPos + data.count) {
          assignedJudge = data.judge;
          break;
        }
        currentPos += data.count;
      }

      if (assignedJudge) {
        console.log(`   ✅ Velixify assigned to: ${assignedJudge.user_id.first_name} ${assignedJudge.user_id.last_name}`);
      } else {
        console.log(`   ❌ Velixify not assigned to any judge`);
      }
    }

    // Show distribution summary
    console.log('📊 DISTRIBUTION SUMMARY:');
    Object.entries(distribution).forEach(([judgeId, data]) => {
      console.log(`${data.judge.user_id.first_name} ${data.judge.user_id.last_name}: ${data.count} applications`);
    });

    // Calculate fairness metrics
    const counts = Object.values(distribution).map(d => d.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const difference = maxCount - minCount;

    console.log(`\n📈 FAIRNESS METRICS:`);
    console.log(`   Minimum applications: ${minCount}`);
    console.log(`   Maximum applications: ${maxCount}`);
    console.log(`   Difference: ${difference} applications`);
    console.log(`   Fairness: ${difference <= 1 ? '✅ EXCELLENT' : difference <= 2 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

implementEqualDistribution();
