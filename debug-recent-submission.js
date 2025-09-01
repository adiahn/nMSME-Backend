const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function debugRecentSubmission() {
  try {
    console.log('🔍 DEBUGGING RECENT APPLICATION SUBMISSIONS\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get ALL applications with full details
    const Application = require('./models/Application');
    const allApps = await Application.find()
      .sort('-createdAt')
      .populate('user_id', 'first_name last_name email');

    console.log(`📊 Total Applications Found: ${allApps.length}\n`);
    
    if (allApps.length === 0) {
      console.log('❌ No applications found in database');
      return;
    }

    // Show all applications with detailed info
    allApps.forEach((app, index) => {
      console.log(`\n${index + 1}. Application ID: ${app._id}`);
      console.log(`   Business Name: ${app.business_name}`);
      console.log(`   User: ${app.user_id ? app.user_id.first_name + ' ' + app.user_id.last_name : 'Unknown'} (${app.user_id ? app.user_id.email : 'No email'})`);
      console.log(`   Category: ${app.category}`);
      console.log(`   Sector: ${app.sector}`);
      console.log(`   Workflow Stage: ${app.workflow_stage}`);
      console.log(`   Created: ${app.createdAt.toLocaleString()}`);
      console.log(`   Updated: ${app.updatedAt.toLocaleString()}`);
      console.log(`   Documents: ${app.documents ? app.documents.length : 0}`);
      console.log(`   Pitch Video: ${app.pitch_video ? 'Yes' : 'No'}`);
      console.log(`   Status: ${app.status || 'Not set'}`);
      console.log('   ---');
    });

    // Check for any applications created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentApps = allApps.filter(app => app.createdAt > oneHourAgo);
    
    if (recentApps.length > 0) {
      console.log(`\n🕐 Applications created in the last hour: ${recentApps.length}`);
      recentApps.forEach(app => {
        console.log(`   - ${app.business_name} (${app.createdAt.toLocaleString()})`);
      });
    } else {
      console.log('\n🕐 No applications created in the last hour');
    }

    // Check workflow stages
    const stages = {};
    allApps.forEach(app => {
      stages[app.workflow_stage] = (stages[app.workflow_stage] || 0) + 1;
    });
    
    console.log('\n📈 Applications by Workflow Stage:');
    Object.entries(stages).forEach(([stage, count]) => {
      console.log(`   ${stage}: ${count}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

debugRecentSubmission();
