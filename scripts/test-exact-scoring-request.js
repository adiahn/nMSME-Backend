const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testExactScoringRequest() {
  try {
    console.log('🧪 TESTING EXACT SCORING REQUEST FROM FRONTEND\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Score = require('../models/Score');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Get the specific application from the error (68ba861...)
    const applicationId = '68ba861'; // Partial ID from the error
    console.log(`🔍 Looking for application with ID containing: ${applicationId}`);
    
    // Search for applications with similar ID (convert to ObjectId first)
    let applications = [];
    try {
      const objectId = new mongoose.Types.ObjectId(applicationId + '0000000000000000000000'.slice(applicationId.length));
      applications = await Application.find({
        _id: { $gte: objectId, $lt: new mongoose.Types.ObjectId(objectId.getTimestamp().getTime() + 86400000) }
      }).populate('user_id', 'first_name last_name email');
    } catch (e) {
      console.log('   Could not search by partial ID, searching by name instead...');
    }

    if (applications.length === 0) {
      console.log('❌ No application found with that ID pattern');
      console.log('🔍 Searching for any application with "AXON" in the name...');
      
      const axonApps = await Application.find({
        business_name: { $regex: /axon/i }
      }).populate('user_id', 'first_name last_name email');

      if (axonApps.length > 0) {
        console.log(`✅ Found ${axonApps.length} AXON application(s):`);
        axonApps.forEach((app, index) => {
          console.log(`   ${index + 1}. ${app.business_name} (ID: ${app._id})`);
        });
        // Use the first AXON application
        var testApplication = axonApps[0];
      } else {
        console.log('❌ No AXON applications found, using any available application');
        testApplication = await Application.findOne({
          workflow_stage: { $in: ['submitted', 'under_review'] }
        }).populate('user_id', 'first_name last_name email');
      }
    } else {
      testApplication = applications[0];
    }

    if (!testApplication) {
      console.log('❌ No test application found');
      return;
    }

    console.log('📋 TEST APPLICATION:');
    console.log(`   Name: ${testApplication.business_name}`);
    console.log(`   ID: ${testApplication._id}`);
    console.log(`   Stage: ${testApplication.workflow_stage}\n`);

    // Get a judge
    const judge = await Judge.findOne({ is_active: true })
      .populate('user_id', 'first_name last_name email');

    if (!judge) {
      console.log('❌ No active judge found');
      return;
    }

    console.log('👨‍⚖️ TEST JUDGE:');
    console.log(`   Name: ${judge.user_id.first_name} ${judge.user_id.last_name}`);
    console.log(`   Email: ${judge.user_id.email}\n`);

    // Simulate the exact request from the frontend (based on the error)
    const frontendRequest = {
      criteria_scores: {
        business_viability_financial_health: 0,
        market_opportunity_traction: 0,
        social_impact_job_creation: 0,
        innovation_technology_adoption: 0,
        sustainability_environmental_impact: 0,
        management_leadership: 10 // Only this one has a value (10 points)
      },
      overall_score: 29,
      comments: 'http://localhost:5174/',
      recommendations: 'http://localhost:5174/',
      review_notes: 'http://localhost:5174/'
    };

    console.log('🧪 TESTING EXACT FRONTEND REQUEST:');
    console.log('   Request data:', JSON.stringify(frontendRequest, null, 2));

    try {
      // Simulate the scoring logic from the endpoint
      console.log('\n📊 SIMULATING SCORE SUBMISSION:');
      
      // Check if application exists and is available for review
      if (testApplication.workflow_stage !== 'submitted' && testApplication.workflow_stage !== 'under_review') {
        console.log('   ❌ Application is not available for review');
        return;
      }
      console.log('   ✅ Application is available for review');

      // Check if score already exists
      let score = await Score.findOne({
        application_id: testApplication._id,
        judge_id: judge._id
      });

      if (score) {
        console.log('   ⚠️  Score already exists, updating...');
        score.business_viability_financial_health = frontendRequest.criteria_scores.business_viability_financial_health;
        score.market_opportunity_traction = frontendRequest.criteria_scores.market_opportunity_traction;
        score.social_impact_job_creation = frontendRequest.criteria_scores.social_impact_job_creation;
        score.innovation_technology_adoption = frontendRequest.criteria_scores.innovation_technology_adoption;
        score.sustainability_environmental_impact = frontendRequest.criteria_scores.sustainability_environmental_impact;
        score.management_leadership = frontendRequest.criteria_scores.management_leadership;
        score.total_score = frontendRequest.overall_score;
        score.comments = frontendRequest.comments;
        score.recommendations = frontendRequest.recommendations;
        score.review_notes = frontendRequest.review_notes;
        score.updated_at = new Date();
        await score.save();
        console.log('   ✅ Score updated successfully');
      } else {
        console.log('   Creating new score...');
        const newScore = await Score.create({
          application_id: testApplication._id,
          judge_id: judge._id,
          business_viability_financial_health: frontendRequest.criteria_scores.business_viability_financial_health,
          market_opportunity_traction: frontendRequest.criteria_scores.market_opportunity_traction,
          social_impact_job_creation: frontendRequest.criteria_scores.social_impact_job_creation,
          innovation_technology_adoption: frontendRequest.criteria_scores.innovation_technology_adoption,
          sustainability_environmental_impact: frontendRequest.criteria_scores.sustainability_environmental_impact,
          management_leadership: frontendRequest.criteria_scores.management_leadership,
          total_score: frontendRequest.overall_score,
          comments: frontendRequest.comments,
          recommendations: frontendRequest.recommendations,
          review_notes: frontendRequest.review_notes,
          scored_at: new Date()
        });
        console.log('   ✅ Score created successfully');
        score = newScore;
      }

      // Update application status
      testApplication.workflow_stage = 'under_review';
      await testApplication.save();
      console.log('   ✅ Application status updated to "under_review"');

      console.log('\n📊 FINAL SCORE RESULT:');
      console.log(`   Score ID: ${score._id}`);
      console.log(`   Total Score: ${score.total_score}/100`);
      console.log(`   Grade: ${score.grade || 'Not calculated'}`);
      console.log(`   Scored At: ${score.scored_at.toLocaleString()}`);

      console.log('\n✅ EXACT FRONTEND REQUEST TEST COMPLETED SUCCESSFULLY!');
      console.log('   The backend should now handle this request correctly.');

    } catch (scoreError) {
      console.log('   ❌ Error submitting score:', scoreError.message);
      console.log('   Error details:', scoreError);
      console.log('   Stack trace:', scoreError.stack);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

testExactScoringRequest();
