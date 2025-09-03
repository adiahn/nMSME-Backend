const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function simpleCheckApps() {
  try {
    console.log('🔍 SIMPLE CHECK OF APPLICATIONS\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get applications without populating user_id
    const Application = require('./models/Application');
    const apps = await Application.find()
      .sort('-createdAt')
      .select('business_name category sector workflow_stage createdAt updatedAt documents pitch_video');

    console.log(`📊 Total Applications: ${apps.length}\n`);
    
    if (apps.length === 0) {
      console.log('❌ No applications found');
      return;
    }

    // Show all applications
    apps.forEach((app, index) => {
      console.log(`${index + 1}. ${app.business_name}`);
      console.log(`   ID: ${app._id}`);
      console.log(`   Category: ${app.category}`);
      console.log(`   Sector: ${app.sector}`);
      console.log(`   Stage: ${app.workflow_stage}`);
      console.log(`   Created: ${app.createdAt.toLocaleString()}`);
      console.log(`   Updated: ${app.updatedAt.toLocaleString()}`);
      console.log(`   Documents: ${app.documents ? app.documents.length : 0}`);
      console.log(`   Pitch Video: ${app.pitch_video ? 'Yes' : 'No'}`);
      console.log('   ---');
    });

    // Check recent applications (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentApps = apps.filter(app => app.createdAt > twoHoursAgo);
    
    if (recentApps.length > 0) {
      console.log(`\n🕐 Recent applications (last 2 hours): ${recentApps.length}`);
      recentApps.forEach(app => {
        console.log(`   - ${app.business_name} (${app.createdAt.toLocaleString()})`);
      });
    } else {
      console.log('\n🕐 No applications created in the last 2 hours');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

simpleCheckApps();
