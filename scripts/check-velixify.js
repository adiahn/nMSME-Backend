const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function checkVelixify() {
  try {
    console.log('🔍 CHECKING VELIXIFY LTD APPLICATION\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');

    // Search for Velixify LTD
    const velixifyApp = await Application.findOne({ 
      business_name: { $regex: /velixify/i } 
    }).select('business_name category sector workflow_stage createdAt submission_date');

    if (velixifyApp) {
      console.log('📋 VELIXIFY LTD APPLICATION FOUND:');
      console.log(`   Business Name: ${velixifyApp.business_name}`);
      console.log(`   Category: ${velixifyApp.category}`);
      console.log(`   Sector: ${velixifyApp.sector}`);
      console.log(`   Workflow Stage: ${velixifyApp.workflow_stage}`);
      console.log(`   Created: ${velixifyApp.createdAt.toLocaleString()}`);
      if (velixifyApp.submission_date) {
        console.log(`   Submitted: ${velixifyApp.submission_date.toLocaleString()}`);
      }
      
      // Check if category and sector match
      if (velixifyApp.category === velixifyApp.sector) {
        console.log('   ✅ Category and Sector match');
      } else {
        console.log('   ⚠️  Category and Sector DO NOT match');
      }
    } else {
      console.log('❌ Velixify LTD application not found');
      
      // Let's search for similar names
      console.log('\n🔍 Searching for similar business names...');
      const similarApps = await Application.find({
        business_name: { $regex: /velix|VELIX/i }
      }).select('business_name category sector workflow_stage');
      
      if (similarApps.length > 0) {
        console.log('📋 Similar applications found:');
        similarApps.forEach((app, index) => {
          console.log(`${index + 1}. ${app.business_name}`);
          console.log(`   Category: ${app.category}`);
          console.log(`   Sector: ${app.sector}`);
          console.log(`   Stage: ${app.workflow_stage}`);
          console.log('');
        });
      } else {
        console.log('No similar applications found');
      }
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

checkVelixify();
