const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testNewDistribution() {
  try {
    console.log('🧪 TESTING NEW EQUAL DISTRIBUTION SYSTEM\n');
    
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

    // Calculate equal distribution
    const totalApplications = allApplications.length;
    const totalJudges = allJudges.length;
    const applicationsPerJudge = Math.floor(totalApplications / totalJudges);
    const extraApplications = totalApplications % totalJudges;

    console.log(`📋 Distribution plan:`);
    console.log(`   Applications per judge: ${applicationsPerJudge}`);
    console.log(`   Extra applications: ${extraApplications}\n`);

    // Show distribution for each judge
    allJudges.forEach((judge, judgeIndex) => {
      const startIndex = judgeIndex * applicationsPerJudge + Math.min(judgeIndex, extraApplications);
      const endIndex = startIndex + applicationsPerJudge + (judgeIndex < extraApplications ? 1 : 0);
      const judgeApplications = allApplications.slice(startIndex, endIndex);

      console.log(`👨‍⚖️ ${judge.user_id.first_name} ${judge.user_id.last_name}:`);
      console.log(`   Applications: ${judgeApplications.length}`);
      console.log(`   Range: ${startIndex + 1}-${endIndex}`);
      
      // Show sector breakdown
      const sectorBreakdown = {};
      judgeApplications.forEach(app => {
        sectorBreakdown[app.sector] = (sectorBreakdown[app.sector] || 0) + 1;
      });
      
      console.log(`   Sectors:`);
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
      const velixifyIndex = allApplications.findIndex(app => app._id.equals(velixifyApp._id));
      const assignedJudgeIndex = Math.floor(velixifyIndex / (applicationsPerJudge + 1));
      const assignedJudge = allJudges[assignedJudgeIndex];
      
      console.log(`   Position in sorted list: ${velixifyIndex + 1}`);
      console.log(`   Assigned to: ${assignedJudge.user_id.first_name} ${assignedJudge.user_id.last_name}`);
      
      // Check if judge has IT expertise
      const expertiseToSectorMap = {
        'fashion': 'Fashion',
        'it': 'Information Technology (IT)',
        'agribusiness': 'Agribusiness',
        'food_beverage': 'Food & Beverage',
        'light_manufacturing': 'Light Manufacturing',
        'creative_enterprise': 'Creative Enterprise',
        'nano_category': 'Emerging Enterprise Award',
        'emerging_enterprise': 'Emerging Enterprise Award'
      };
      
      const judgeSectors = assignedJudge.expertise_sectors.map(sector => expertiseToSectorMap[sector]).filter(Boolean);
      const hasITExpertise = judgeSectors.includes('Information Technology (IT)');
      
      console.log(`   Judge expertise: ${assignedJudge.expertise_sectors.join(', ')}`);
      console.log(`   Judge sectors: ${judgeSectors.join(', ')}`);
      console.log(`   Has IT expertise: ${hasITExpertise ? '✅ YES' : '❌ NO'}`);
    }

    // Calculate fairness
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

    console.log(`\n🎯 SUMMARY:`);
    console.log(`   Each judge will now see only their assigned applications`);
    console.log(`   Judge One: ${counts[0]} applications`);
    console.log(`   Judge Two: ${counts[1]} applications`);
    console.log(`   Judge Three: ${counts[2]} applications`);
    console.log(`   Judge Four: ${counts[3]} applications`);

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

testNewDistribution();
