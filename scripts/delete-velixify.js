const mongoose = require('mongoose');
const Application = require('../models/Application');
const Score = require('../models/Score');
require('dotenv').config({ path: './config.env' });

async function deleteVelixifyApplication() {
  try {
    console.log('🗑️ Deleting Velixify Ltd Application...\n');

    // Connect to the correct production database
    const baseUri = 'mongodb+srv://admin:admin123@cluster0.0xw4ojd.mongodb.net/';
    const dbName = process.env.DB_NAME || 'nmsme_awards';
    const correctUri = `${baseUri}${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
    
    console.log('1️⃣ Connecting to production database...');
    await mongoose.connect(correctUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('   ✅ Connected to production database');

    const applicationId = '68baf2481debf5776a661df0';

    // First, let's get the application details
    console.log('\n2️⃣ Retrieving application details...');
    const application = await Application.findById(applicationId);
    
    if (!application) {
      console.log('   ❌ Application not found');
      return;
    }

    console.log('   ✅ Application found:');
    console.log(`   - Business Name: ${application.business_name}`);
    console.log(`   - Category: ${application.category}`);
    console.log(`   - Workflow Stage: ${application.workflow_stage}`);
    console.log(`   - Created: ${application.createdAt}`);
    console.log(`   - User ID: ${application.user_id}`);

    // Check for associated scores
    console.log('\n3️⃣ Checking for associated scores...');
    const scores = await Score.find({ assignment_id: applicationId });
    console.log(`   Found ${scores.length} associated scores`);

    if (scores.length > 0) {
      console.log('   Scores to be deleted:');
      scores.forEach((score, index) => {
        console.log(`   ${index + 1}. Judge: ${score.judge_id}, Total Score: ${score.total_score}, Grade: ${score.grade}`);
      });
    }

    // Check if application can be deleted
    console.log('\n4️⃣ Checking deletion eligibility...');
    const restrictedStages = ['under_review', 'shortlisted', 'finalist', 'winner'];
    
    if (restrictedStages.includes(application.workflow_stage)) {
      console.log(`   ⚠️  Application is in '${application.workflow_stage}' stage`);
      console.log('   This application cannot be deleted as it has progressed in the review process');
      return;
    }

    console.log(`   ✅ Application is in '${application.workflow_stage}' stage - can be deleted`);

    // Delete associated scores first
    if (scores.length > 0) {
      console.log('\n5️⃣ Deleting associated scores...');
      const deletedScores = await Score.deleteMany({ assignment_id: applicationId });
      console.log(`   ✅ Deleted ${deletedScores.deletedCount} scores`);
    }

    // Delete the application
    console.log('\n6️⃣ Deleting application...');
    const deletedApplication = await Application.findByIdAndDelete(applicationId);
    
    if (deletedApplication) {
      console.log('   ✅ Application deleted successfully');
      console.log('\n📋 Deletion Summary:');
      console.log(`   - Application ID: ${applicationId}`);
      console.log(`   - Business Name: ${deletedApplication.business_name}`);
      console.log(`   - Category: ${deletedApplication.category}`);
      console.log(`   - Workflow Stage: ${deletedApplication.workflow_stage}`);
      console.log(`   - Scores Deleted: ${scores.length}`);
      console.log(`   - Deleted At: ${new Date().toISOString()}`);
      console.log(`   - Deleted By: Admin (Script)`);
      
      console.log('\n🎉 Velixify Ltd application has been successfully deleted!');
    } else {
      console.log('   ❌ Failed to delete application');
    }

    // Verify deletion
    console.log('\n7️⃣ Verifying deletion...');
    const verifyApp = await Application.findById(applicationId);
    if (!verifyApp) {
      console.log('   ✅ Confirmed: Application no longer exists in database');
    } else {
      console.log('   ❌ Error: Application still exists in database');
    }

  } catch (error) {
    console.error('❌ Error deleting application:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the deletion
deleteVelixifyApplication();

