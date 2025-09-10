const mongoose = require('mongoose');
const Application = require('../models/Application');
const Score = require('../models/Score');
require('dotenv').config({ path: './config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function deleteSpecificApplication() {
  try {
    console.log('🗑️ Deleting Application: 68baf2481debf5776a661df0\n');

    const applicationId = '68baf2481debf5776a661df0';

    // First, let's check if the application exists
    console.log('1️⃣ Checking if application exists...');
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
    console.log('\n2️⃣ Checking for associated scores...');
    const scores = await Score.find({ assignment_id: applicationId });
    console.log(`   Found ${scores.length} associated scores`);

    if (scores.length > 0) {
      console.log('   Scores to be deleted:');
      scores.forEach((score, index) => {
        console.log(`   ${index + 1}. Judge: ${score.judge_id}, Total Score: ${score.total_score}, Grade: ${score.grade}`);
      });
    }

    // Check if application can be deleted
    console.log('\n3️⃣ Checking deletion eligibility...');
    const restrictedStages = ['under_review', 'shortlisted', 'finalist', 'winner'];
    
    if (restrictedStages.includes(application.workflow_stage)) {
      console.log(`   ⚠️  Application is in '${application.workflow_stage}' stage`);
      console.log('   This application cannot be deleted as it has progressed in the review process');
      console.log('   Only applications in draft or submitted stages can be deleted');
      return;
    }

    console.log(`   ✅ Application is in '${application.workflow_stage}' stage - can be deleted`);

    // Delete associated scores first
    if (scores.length > 0) {
      console.log('\n4️⃣ Deleting associated scores...');
      const deletedScores = await Score.deleteMany({ assignment_id: applicationId });
      console.log(`   ✅ Deleted ${deletedScores.deletedCount} scores`);
    }

    // Delete the application
    console.log('\n5️⃣ Deleting application...');
    const deletedApplication = await Application.findByIdAndDelete(applicationId);
    
    if (deletedApplication) {
      console.log('   ✅ Application deleted successfully');
      console.log('\n📋 Deletion Summary:');
      console.log(`   - Application ID: ${applicationId}`);
      console.log(`   - Business Name: ${deletedApplication.business_name}`);
      console.log(`   - Category: ${deletedApplication.category}`);
      console.log(`   - Scores Deleted: ${scores.length}`);
      console.log(`   - Deleted At: ${new Date().toISOString()}`);
    } else {
      console.log('   ❌ Failed to delete application');
    }

  } catch (error) {
    console.error('❌ Error deleting application:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the deletion
deleteSpecificApplication();

