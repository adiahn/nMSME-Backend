const mongoose = require('mongoose');
const Application = require('../models/Application');
require('dotenv').config({ path: './config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function listApplications() {
  try {
    console.log('📋 Listing All Applications...\n');

    // Get all applications
    const applications = await Application.find()
      .sort({ createdAt: -1 })
      .select('_id business_name category workflow_stage createdAt user_id');
    
    if (applications.length === 0) {
      console.log('   No applications found in database');
      return;
    }

    console.log(`   Found ${applications.length} applications:\n`);

    applications.forEach((app, index) => {
      console.log(`${index + 1}. Application ID: ${app._id}`);
      console.log(`   Business Name: ${app.business_name}`);
      console.log(`   Category: ${app.category}`);
      console.log(`   Workflow Stage: ${app.workflow_stage}`);
      console.log(`   Created: ${app.createdAt}`);
      console.log(`   User ID: ${app.user_id}`);
      console.log('');
    });

    // Check if the specific ID exists
    console.log('🔍 Checking for specific ID: 68baf2481debf5776a661df0');
    const specificId = '68baf2481debf5776a661df0';
    const foundApp = applications.find(app => app._id.toString() === specificId);
    
    if (foundApp) {
      console.log('   ✅ Found the application!');
      console.log(`   - Business Name: ${foundApp.business_name}`);
      console.log(`   - Category: ${foundApp.category}`);
      console.log(`   - Workflow Stage: ${foundApp.workflow_stage}`);
    } else {
      console.log('   ❌ Application with that ID not found');
      console.log('   The application may have already been deleted or the ID is incorrect');
    }

    // Show applications that can be deleted
    console.log('\n🗑️ Applications that can be deleted (draft or submitted):');
    const deletableApps = applications.filter(app => 
      app.workflow_stage === 'draft' || app.workflow_stage === 'submitted'
    );
    
    if (deletableApps.length > 0) {
      deletableApps.forEach((app, index) => {
        console.log(`${index + 1}. ${app._id} - ${app.business_name} (${app.workflow_stage})`);
      });
    } else {
      console.log('   No applications can be deleted (all are under review or further)');
    }

  } catch (error) {
    console.error('❌ Error listing applications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the listing
listApplications();

