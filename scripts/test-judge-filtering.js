const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testJudgeFiltering() {
  try {
    console.log('🔍 TESTING JUDGE FILTERING LOGIC\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Get a sample judge
    const judge = await Judge.findOne().populate('user_id', 'first_name last_name email');
    if (!judge) {
      console.log('❌ No judges found');
      return;
    }

    console.log(`👨‍⚖️ Testing with judge: ${judge.user_id.first_name} ${judge.user_id.last_name}`);
    console.log(`📋 Judge expertise sectors: ${judge.expertise_sectors.join(', ')}\n`);

    // Map judge expertise sectors to application sectors (same logic as in judge routes)
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
    console.log(`🎯 Mapped to application sectors: ${judgeSectors.join(', ')}\n`);

    // Get all applications
    const allApps = await Application.find()
      .select('business_name category sector workflow_stage createdAt')
      .sort('-createdAt')
      .limit(20);

    console.log(`📊 Total applications found: ${allApps.length}\n`);

    // Test the judge filtering logic
    const query = {
      sector: { $in: judgeSectors }
    };

    const filteredApps = await Application.find(query)
      .select('business_name category sector workflow_stage createdAt')
      .sort('-createdAt')
      .limit(10);

    console.log(`🔍 Applications matching judge sectors: ${filteredApps.length}\n`);

    console.log('📋 All applications (first 10):');
    allApps.forEach((app, index) => {
      const isMatch = judgeSectors.includes(app.sector);
      console.log(`${index + 1}. ${app.business_name}`);
      console.log(`   Category: ${app.category}`);
      console.log(`   Sector: ${app.sector} ${isMatch ? '✅' : '❌'}`);
      console.log(`   Stage: ${app.workflow_stage}`);
      console.log('');
    });

    console.log('🎯 Applications visible to judge:');
    filteredApps.forEach((app, index) => {
      console.log(`${index + 1}. ${app.business_name}`);
      console.log(`   Category: ${app.category}`);
      console.log(`   Sector: ${app.sector}`);
      console.log(`   Stage: ${app.workflow_stage}`);
      console.log('');
    });

    // Check for category/sector mismatches
    console.log('⚠️  Applications with category/sector mismatches:');
    const mismatchedApps = allApps.filter(app => app.category !== app.sector);
    mismatchedApps.forEach((app, index) => {
      console.log(`${index + 1}. ${app.business_name}`);
      console.log(`   Category: ${app.category}`);
      console.log(`   Sector: ${app.sector}`);
      console.log(`   Would be visible: ${judgeSectors.includes(app.sector) ? 'YES' : 'NO'}`);
      console.log('');
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

testJudgeFiltering();
