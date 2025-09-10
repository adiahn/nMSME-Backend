const mongoose = require('mongoose');
const Application = require('../models/Application');
require('dotenv').config({ path: './config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function searchVelixify() {
  try {
    console.log('🔍 Searching for Velixify Ltd Application...\n');

    // Search for applications with "velixify" in the business name (case insensitive)
    const velixifyApps = await Application.find({
      business_name: { $regex: /velixify/i }
    }).sort({ createdAt: -1 });

    if (velixifyApps.length === 0) {
      console.log('   ❌ No applications found for "Velixify Ltd"');
      
      // Let's also search for similar names
      console.log('\n🔍 Searching for similar business names...');
      const similarApps = await Application.find({
        business_name: { $regex: /velix|veli|ixify/i }
      }).sort({ createdAt: -1 });
      
      if (similarApps.length > 0) {
        console.log(`   Found ${similarApps.length} similar applications:`);
        similarApps.forEach((app, index) => {
          console.log(`   ${index + 1}. ${app.business_name} (ID: ${app._id})`);
        });
      } else {
        console.log('   No similar applications found');
      }
      
      // Show all applications to help identify the correct one
      console.log('\n📋 All applications in database:');
      const allApps = await Application.find()
        .sort({ createdAt: -1 })
        .select('_id business_name category workflow_stage createdAt');
      
      if (allApps.length > 0) {
        console.log(`   Found ${allApps.length} total applications:`);
        allApps.forEach((app, index) => {
          console.log(`   ${index + 1}. ${app.business_name}`);
          console.log(`      ID: ${app._id}`);
          console.log(`      Category: ${app.category}`);
          console.log(`      Stage: ${app.workflow_stage}`);
          console.log(`      Created: ${app.createdAt}`);
          console.log('');
        });
      } else {
        console.log('   No applications found in database');
      }
      
      return;
    }

    console.log(`   ✅ Found ${velixifyApps.length} application(s) for Velixify Ltd:\n`);

    velixifyApps.forEach((app, index) => {
      console.log(`${index + 1}. Application Details:`);
      console.log(`   - ID: ${app._id}`);
      console.log(`   - Business Name: ${app.business_name}`);
      console.log(`   - Category: ${app.category}`);
      console.log(`   - Workflow Stage: ${app.workflow_stage}`);
      console.log(`   - Created: ${app.createdAt}`);
      console.log(`   - Updated: ${app.updatedAt}`);
      console.log(`   - User ID: ${app.user_id}`);
      
      if (app.business_description) {
        console.log(`   - Description: ${app.business_description.substring(0, 100)}...`);
      }
      
      if (app.key_achievements) {
        console.log(`   - Key Achievements: ${app.key_achievements.substring(0, 100)}...`);
      }
      
      console.log(`   - Business Registration: ${app.business_registration_status}`);
      if (app.cac_number) {
        console.log(`   - CAC Number: ${app.cac_number}`);
      }
      
      console.log(`   - MSME Strata: ${app.msme_strata}`);
      console.log(`   - Sector: ${app.sector}`);
      console.log(`   - Employee Count: ${app.employee_count}`);
      console.log(`   - Revenue Band: ${app.revenue_band}`);
      console.log(`   - Year Established: ${app.year_established}`);
      
      if (app.location) {
        console.log(`   - Location: ${app.location.state}, ${app.location.lga}`);
      }
      
      if (app.documents && app.documents.length > 0) {
        console.log(`   - Documents: ${app.documents.length} uploaded`);
      }
      
      if (app.scores && app.scores.length > 0) {
        console.log(`   - Scores: ${app.scores.length} judge(s) scored`);
        app.scores.forEach((score, scoreIndex) => {
          console.log(`     ${scoreIndex + 1}. Judge: ${score.judge_id}, Total: ${score.total_score}, Grade: ${score.grade}`);
        });
      }
      
      console.log('');
    });

    // Show deletion eligibility
    console.log('🗑️ Deletion Status:');
    velixifyApps.forEach((app, index) => {
      const canDelete = ['draft', 'submitted'].includes(app.workflow_stage);
      const canAdminDelete = !['under_review', 'shortlisted', 'finalist', 'winner'].includes(app.workflow_stage);
      
      console.log(`   Application ${index + 1} (${app._id}):`);
      console.log(`   - User can delete: ${canDelete ? '✅ Yes' : '❌ No'} (stage: ${app.workflow_stage})`);
      console.log(`   - Admin can delete: ${canAdminDelete ? '✅ Yes' : '❌ No'}`);
    });

  } catch (error) {
    console.error('❌ Error searching for Velixify application:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the search
searchVelixify();

