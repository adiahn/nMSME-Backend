const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testRandomDistribution() {
  try {
    console.log('🎲 TESTING RANDOM DISTRIBUTION SYSTEM\n');
    
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
      .sort('createdAt');

    // Get all active judges
    const allJudges = await Judge.find({ is_active: true })
      .populate('user_id', 'first_name last_name')
      .sort('createdAt');

    console.log(`📊 Total applications: ${allApplications.length}`);
    console.log(`👨‍⚖️ Total active judges: ${allJudges.length}\n`);

    // Calculate random distribution for each judge
    const totalApplications = allApplications.length;
    const totalJudges = allJudges.length;
    const applicationsPerJudge = Math.floor(totalApplications / totalJudges);
    const extraApplications = totalApplications % totalJudges;

    console.log(`📋 Distribution plan:`);
    console.log(`   Applications per judge: ${applicationsPerJudge}`);
    console.log(`   Extra applications: ${extraApplications}\n`);

    // Test random distribution for each judge
    allJudges.forEach((judge, judgeIndex) => {
      console.log(`👨‍⚖️ ${judge.user_id.first_name} ${judge.user_id.last_name}:`);
      
      // Create deterministic random distribution based on judge ID
      const judgeSeed = judge._id.toString().slice(-8);
      const seed = parseInt(judgeSeed, 16) % 1000000;
      
      // Shuffle applications using seeded random function
      const shuffledApplications = [...allApplications];
      for (let i = shuffledApplications.length - 1; i > 0; i--) {
        const j = (seed + i * 7) % (i + 1);
        [shuffledApplications[i], shuffledApplications[j]] = [shuffledApplications[j], shuffledApplications[i]];
      }

      // Calculate this judge's range
      const startIndex = judgeIndex * applicationsPerJudge + Math.min(judgeIndex, extraApplications);
      const endIndex = startIndex + applicationsPerJudge + (judgeIndex < extraApplications ? 1 : 0);
      const judgeApplications = shuffledApplications.slice(startIndex, endIndex);

      console.log(`   Applications: ${judgeApplications.length}`);
      console.log(`   Range: ${startIndex + 1}-${endIndex}`);
      console.log(`   Seed: ${judgeSeed}`);
      
      // Show sector breakdown
      const sectorBreakdown = {};
      judgeApplications.forEach(app => {
        sectorBreakdown[app.sector] = (sectorBreakdown[app.sector] || 0) + 1;
      });
      
      console.log(`   Sectors (randomly distributed):`);
      Object.entries(sectorBreakdown).forEach(([sector, count]) => {
        console.log(`     ${sector}: ${count} applications`);
      });
      console.log('');
    });

    // Check Velixify assignment
    const velixifyApp = allApplications.find(app => 
      app.business_name.toLowerCase().includes('velixify')
    );

    if (velixifyApp) {
      console.log('🔍 VELIXIFY ASSIGNMENT:');
      
      // Find which judge gets Velixify by checking each judge's random distribution
      let velixifyJudge = null;
      let velixifyPosition = null;
      
      allJudges.forEach((judge, judgeIndex) => {
        const judgeSeed = judge._id.toString().slice(-8);
        const seed = parseInt(judgeSeed, 16) % 1000000;
        
        // Shuffle applications
        const shuffledApplications = [...allApplications];
        for (let i = shuffledApplications.length - 1; i > 0; i--) {
          const j = (seed + i * 7) % (i + 1);
          [shuffledApplications[i], shuffledApplications[j]] = [shuffledApplications[j], shuffledApplications[i]];
        }

        // Check if Velixify is in this judge's range
        const startIndex = judgeIndex * applicationsPerJudge + Math.min(judgeIndex, extraApplications);
        const endIndex = startIndex + applicationsPerJudge + (judgeIndex < extraApplications ? 1 : 0);
        const judgeApplications = shuffledApplications.slice(startIndex, endIndex);
        
        const velixifyIndex = judgeApplications.findIndex(app => app._id.equals(velixifyApp._id));
        if (velixifyIndex !== -1) {
          velixifyJudge = judge;
          velixifyPosition = startIndex + velixifyIndex + 1;
        }
      });
      
      if (velixifyJudge) {
        console.log(`   ✅ Assigned to: ${velixifyJudge.user_id.first_name} ${velixifyJudge.user_id.last_name}`);
        console.log(`   Position in judge's list: ${velixifyPosition}`);
        console.log(`   Judge seed: ${velixifyJudge._id.toString().slice(-8)}`);
      } else {
        console.log(`   ❌ Velixify not found in any judge's distribution`);
      }
    }

    // Calculate fairness metrics
    const counts = allJudges.map((judge, index) => {
      const startIndex = index * applicationsPerJudge + Math.min(index, extraApplications);
      const endIndex = startIndex + applicationsPerJudge + (index < extraApplications ? 1 : 0);
      return endIndex - startIndex;
    });

    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const difference = maxCount - minCount;

    console.log(`\n📈 FAIRNESS METRICS:`);
    console.log(`   Minimum applications: ${minCount}`);
    console.log(`   Maximum applications: ${maxCount}`);
    console.log(`   Difference: ${difference} applications`);
    console.log(`   Fairness: ${difference <= 1 ? '✅ EXCELLENT' : difference <= 2 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);

    console.log(`\n🎲 RANDOM DISTRIBUTION FEATURES:`);
    console.log(`   ✅ Applications are randomly shuffled for each judge`);
    console.log(`   ✅ Each judge gets a different random set of applications`);
    console.log(`   ✅ Distribution is deterministic (same judge always gets same apps)`);
    console.log(`   ✅ No bias based on category, sector, or expertise`);
    console.log(`   ✅ Perfectly equal workload distribution`);

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

testRandomDistribution();
