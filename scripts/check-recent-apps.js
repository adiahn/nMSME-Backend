const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function checkRecentApps() {
  try {
    console.log('🔍 CHECKING RECENT APPLICATIONS\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get recent applications
    const Application = require('../models/Application');
    const apps = await Application.find()
      .select('business_name category workflow_stage createdAt')
      .sort('-createdAt')
      .limit(5);

    console.log(`📊 Found ${apps.length} applications:\n`);
    
    if (apps.length === 0) {
      console.log('❌ No applications found');
    } else {
      apps.forEach((app, index) => {
        console.log(`${index + 1}. ${app.business_name}`);
        console.log(`   Category: ${app.category}`);
        console.log(`   Stage: ${app.workflow_stage}`);
        console.log(`   Created: ${app.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

checkRecentApps();
