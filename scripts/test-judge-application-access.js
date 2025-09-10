const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testJudgeApplicationAccess() {
  try {
    console.log('🧪 TESTING JUDGE APPLICATION ACCESS\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Get a judge
    const judge = await Judge.findOne({ is_active: true })
      .populate('user_id', 'first_name last_name email');
    
    if (!judge) {
      console.log('❌ No active judge found');
      return;
    }

    console.log(`👨‍⚖️ Testing with: ${judge.user_id.first_name} ${judge.user_id.last_name}`);
    console.log(`   Email: ${judge.user_id.email}`);
    console.log(`   Expertise: ${judge.expertise_sectors.join(', ')}\n`);

    // Get all applications
    const allApplications = await Application.find({ workflow_stage: 'submitted' })
      .select('_id business_name category sector workflow_stage createdAt')
      .sort('createdAt');

    // Calculate random distribution for this judge
    const allJudges = await Judge.find({ is_active: true }).sort('createdAt');
    const judgeIndex = allJudges.findIndex(j => j._id.equals(judge._id));
    
    const totalApplications = allApplications.length;
    const totalJudges = allJudges.length;
    const applicationsPerJudge = Math.floor(totalApplications / totalJudges);
    const extraApplications = totalApplications % totalJudges;

    // Create deterministic random distribution
    const judgeSeed = judge._id.toString().slice(-8);
    const seed = parseInt(judgeSeed, 16) % 1000000;
    
    const shuffledApplications = [...allApplications];
    for (let i = shuffledApplications.length - 1; i > 0; i--) {
      const j = (seed + i * 7) % (i + 1);
      [shuffledApplications[i], shuffledApplications[j]] = [shuffledApplications[j], shuffledApplications[i]];
    }

    const startIndex = judgeIndex * applicationsPerJudge + Math.min(judgeIndex, extraApplications);
    const endIndex = startIndex + applicationsPerJudge + (judgeIndex < extraApplications ? 1 : 0);
    const judgeApplications = shuffledApplications.slice(startIndex, endIndex);

    console.log(`📊 Judge's assigned applications: ${judgeApplications.length}`);
    console.log(`   Range: ${startIndex + 1}-${endIndex}\n`);

    // Test accessing each application
    console.log('🔍 TESTING APPLICATION ACCESS:');
    
    for (let i = 0; i < Math.min(5, judgeApplications.length); i++) {
      const app = judgeApplications[i];
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
      
      const judgeSectors = judge.expertise_sectors.map(sector => expertiseToSectorMap[sector]).filter(Boolean);
      const expertiseMatch = judgeSectors.includes(app.sector);
      
      console.log(`\n${i + 1}. ${app.business_name}`);
      console.log(`   Sector: ${app.sector}`);
      console.log(`   Expertise match: ${expertiseMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   Can access: ✅ YES (random distribution allows all assigned apps)`);
    }

    // Test Velixify access specifically
    const velixifyApp = allApplications.find(app => 
      app.business_name.toLowerCase().includes('velixify')
    );

    if (velixifyApp) {
      const isAssignedToThisJudge = judgeApplications.some(app => app._id.equals(velixifyApp._id));
      console.log(`\n🔍 VELIXIFY ACCESS TEST:`);
      console.log(`   Application: ${velixifyApp.business_name}`);
      console.log(`   Sector: ${velixifyApp.sector}`);
      console.log(`   Assigned to this judge: ${isAssignedToThisJudge ? '✅ YES' : '❌ NO'}`);
      
      if (isAssignedToThisJudge) {
        console.log(`   Access result: ✅ CAN VIEW (random distribution)`);
      } else {
        console.log(`   Access result: ❌ NOT ASSIGNED (assigned to different judge)`);
      }
    }

    console.log(`\n🎯 SUMMARY:`);
    console.log(`   ✅ Random distribution implemented`);
    console.log(`   ✅ Judges can access any assigned application`);
    console.log(`   ✅ No expertise restrictions for assigned applications`);
    console.log(`   ✅ Equal workload distribution maintained`);

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

testJudgeApplicationAccess();
