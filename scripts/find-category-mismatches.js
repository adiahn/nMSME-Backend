const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function findCategoryMismatches() {
  try {
    console.log('🔍 FINDING CATEGORY/SECTOR MISMATCHES\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const User = require('../models/User');

    // Get all applications
    const allApps = await Application.find()
      .select('business_name category sector workflow_stage createdAt')
      .sort('-createdAt');

    console.log(`📊 Total applications found: ${allApps.length}\n`);

    // Find mismatches
    const mismatchedApps = allApps.filter(app => app.category !== app.sector);
    
    console.log(`⚠️  Applications with category/sector mismatches: ${mismatchedApps.length}\n`);

    if (mismatchedApps.length > 0) {
      console.log('📋 MISMATCHED APPLICATIONS:');
      mismatchedApps.forEach((app, index) => {
        console.log(`${index + 1}. ${app.business_name}`);
        console.log(`   Category: ${app.category}`);
        console.log(`   Sector: ${app.sector}`);
        console.log(`   Stage: ${app.workflow_stage}`);
        console.log(`   Created: ${app.createdAt.toLocaleString()}`);
        console.log('');
      });

      // Group by category/sector combination
      const mismatchGroups = {};
      mismatchedApps.forEach(app => {
        const key = `${app.category} -> ${app.sector}`;
        if (!mismatchGroups[key]) {
          mismatchGroups[key] = [];
        }
        mismatchGroups[key].push(app);
      });

      console.log('📊 MISMATCH PATTERNS:');
      Object.entries(mismatchGroups).forEach(([pattern, apps]) => {
        console.log(`${pattern}: ${apps.length} applications`);
      });
    } else {
      console.log('✅ No category/sector mismatches found!');
    }

    // Check if this affects judge visibility
    console.log('\n🎯 JUDGE VISIBILITY IMPACT:');
    const Judge = require('../models/Judge');
    const judges = await Judge.find().populate('user_id', 'first_name last_name');
    
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

    judges.forEach(judge => {
      const judgeSectors = judge.expertise_sectors.map(sector => expertiseToSectorMap[sector]).filter(Boolean);
      console.log(`\n👨‍⚖️ ${judge.user_id.first_name} ${judge.user_id.last_name}`);
      console.log(`   Expertise: ${judge.expertise_sectors.join(', ')}`);
      console.log(`   Sectors: ${judgeSectors.join(', ')}`);
      
      // Check which mismatched apps would be visible with NEW sector-based filtering
      const visibleMismatched = mismatchedApps.filter(app => judgeSectors.includes(app.sector));
      const hiddenMismatched = mismatchedApps.filter(app => 
        !judgeSectors.includes(app.sector) && judgeSectors.includes(app.category)
      );
      
      if (visibleMismatched.length > 0) {
        console.log(`   ✅ Would see ${visibleMismatched.length} mismatched apps (by sector - NEW LOGIC)`);
        visibleMismatched.forEach(app => {
          console.log(`      - ${app.business_name} (${app.sector} -> ${app.category})`);
        });
      }
      if (hiddenMismatched.length > 0) {
        console.log(`   ❌ Would miss ${hiddenMismatched.length} mismatched apps (by category - OLD LOGIC)`);
        hiddenMismatched.forEach(app => {
          console.log(`      - ${app.business_name} (${app.category} -> ${app.sector})`);
        });
      }
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

findCategoryMismatches();
