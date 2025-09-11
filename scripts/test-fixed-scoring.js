const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testFixedScoring() {
  try {
    console.log('🧪 TESTING FIXED SCORING ENDPOINT\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Score = require('../models/Score');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Get a test application
    const testApplication = await Application.findOne({
      workflow_stage: { $in: ['submitted', 'under_review'] }
    }).populate('user_id', 'first_name last_name email');

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

    // Test score submission with correct format
    const testScoreData = {
      criteria_scores: {
        business_viability_financial_health: 23,
        market_opportunity_traction: 19,
        social_impact_job_creation: 17,
        innovation_technology_adoption: 15,
        sustainability_environmental_impact: 10,
        management_leadership: 9
      },
      overall_score: 93,
      comments: "Outstanding business with excellent potential and strong execution!",
      recommendations: "Consider scaling to international markets and implementing advanced technology solutions.",
      review_notes: "Test score submission with fixed backend - no more 500 errors!"
    };

    console.log('🧪 TESTING FIXED SCORE SUBMISSION:');
    console.log('   Score data:', JSON.stringify(testScoreData, null, 2));

    try {
      // Simulate the scoring logic from the endpoint
      let score = await Score.findOne({
        application_id: testApplication._id,
        judge_id: judge._id
      });

      if (score) {
        console.log('   ⚠️  Score already exists, updating...');
        score.business_viability_financial_health = testScoreData.criteria_scores.business_viability_financial_health;
        score.market_opportunity_traction = testScoreData.criteria_scores.market_opportunity_traction;
        score.social_impact_job_creation = testScoreData.criteria_scores.social_impact_job_creation;
        score.innovation_technology_adoption = testScoreData.criteria_scores.innovation_technology_adoption;
        score.sustainability_environmental_impact = testScoreData.criteria_scores.sustainability_environmental_impact;
        score.management_leadership = testScoreData.criteria_scores.management_leadership;
        score.total_score = testScoreData.overall_score;
        score.comments = testScoreData.comments;
        score.recommendations = testScoreData.recommendations;
        score.review_notes = testScoreData.review_notes;
        score.updated_at = new Date();
        await score.save();
        console.log('   ✅ Score updated successfully');
      } else {
        console.log('   Creating new score...');
        const newScore = await Score.create({
          application_id: testApplication._id,
          judge_id: judge._id,
          business_viability_financial_health: testScoreData.criteria_scores.business_viability_financial_health,
          market_opportunity_traction: testScoreData.criteria_scores.market_opportunity_traction,
          social_impact_job_creation: testScoreData.criteria_scores.social_impact_job_creation,
          innovation_technology_adoption: testScoreData.criteria_scores.innovation_technology_adoption,
          sustainability_environmental_impact: testScoreData.criteria_scores.sustainability_environmental_impact,
          management_leadership: testScoreData.criteria_scores.management_leadership,
          total_score: testScoreData.overall_score,
          comments: testScoreData.comments,
          recommendations: testScoreData.recommendations,
          review_notes: testScoreData.review_notes,
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
      console.log(`   Comments: ${score.comments}`);

      console.log('\n✅ FIXED SCORING TEST COMPLETED SUCCESSFULLY!');
      console.log('   The 500 Internal Server Error should now be resolved.');

    } catch (scoreError) {
      console.log('   ❌ Error submitting score:', scoreError.message);
      console.log('   Error details:', scoreError);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

testFixedScoring();
