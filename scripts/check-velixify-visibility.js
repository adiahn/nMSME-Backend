const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function checkVelixifyVisibility() {
  try {
    console.log('🔍 CHECKING VELIXIFY VISIBILITY FOR JUDGES\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Find Velixify application
    const velixifyApp = await Application.findOne({ 
      business_name: { $regex: /velixify/i } 
    }).select('business_name category sector workflow_stage createdAt');

    if (!velixifyApp) {
      console.log('❌ Velixify application not found');
      return;
    }

    console.log('📋 VELIXIFY APPLICATION:');
    console.log(`   Business Name: ${velixifyApp.business_name}`);
    console.log(`   Category: ${velixifyApp.category}`);
    console.log(`   Sector: ${velixifyApp.sector}`);
    console.log(`   Stage: ${velixifyApp.workflow_stage}`);
    console.log('');

    // Get all judges
    const judges = await Judge.find().populate('user_id', 'first_name last_name email');
    console.log(`👨‍⚖️ Found ${judges.length} judges:\n`);

    // Check which judges should see Velixify
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

    judges.forEach((judge, index) => {
      const judgeSectors = judge.expertise_sectors.map(sector => expertiseToSectorMap[sector]).filter(Boolean);
      const canSeeVelixify = judgeSectors.includes(velixifyApp.sector);
      
      console.log(`${index + 1}. ${judge.user_id.first_name} ${judge.user_id.last_name}`);
      console.log(`   Email: ${judge.user_id.email}`);
      console.log(`   Expertise: ${judge.expertise_sectors.join(', ')}`);
      console.log(`   Sectors: ${judgeSectors.join(', ')}`);
      console.log(`   Can see Velixify: ${canSeeVelixify ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });

    // Check total applications per judge sector
    console.log('📊 APPLICATIONS PER JUDGE SECTOR:');
    const sectorCounts = {};
    for (const sector of Object.values(expertiseToSectorMap)) {
      const count = await Application.countDocuments({ sector: sector });
      sectorCounts[sector] = count;
    }

    Object.entries(sectorCounts).forEach(([sector, count]) => {
      console.log(`${sector}: ${count} applications`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

checkVelixifyVisibility();
