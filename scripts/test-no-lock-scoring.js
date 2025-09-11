const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testNoLockScoring() {
  try {
    console.log('🧪 TESTING SCORING WITHOUT LOCK REQUIREMENT\n');
    
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
    console.log(`   Stage: ${testApplication.workflow_stage}`);
    console.log(`   Applicant: ${testApplication.user_id.first_name} ${testApplication.user_id.last_name}\n`);

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

    // Test score submission without lock
    const testScoreData = {
      criteria_scores: {
        business_viability_financial_health: 22,
        market_opportunity_traction: 18,
        social_impact_job_creation: 16,
        innovation_technology_adoption: 14,
        sustainability_environmental_impact: 9,
        management_leadership: 8
      },
      overall_score: 87,
      comments: "Excellent business with strong potential. No lock required for scoring!",
      recommendations: "Consider expanding to new markets and implementing sustainable practices.",
      review_notes: "Test score submission without lock requirement"
    };

    console.log('🧪 TESTING SCORE SUBMISSION WITHOUT LOCK:');
    console.log('   Score data:', JSON.stringify(testScoreData, null, 2));

    try {
      // Check if score already exists
      let existingScore = await Score.findOne({
        application_id: testApplication._id,
        judge_id: judge._id
      });

      if (existingScore) {
        console.log('   ⚠️  Score already exists, updating...');
        existingScore.criteria_scores = testScoreData.criteria_scores;
        existingScore.total_score = testScoreData.overall_score;
        existingScore.comments = testScoreData.comments;
        existingScore.recommendations = testScoreData.recommendations;
        existingScore.review_notes = testScoreData.review_notes;
        existingScore.updated_at = new Date();
        await existingScore.save();
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
        existingScore = newScore;
      }

      // Update application status
      testApplication.workflow_stage = 'under_review';
      await testApplication.save();
      console.log('   ✅ Application status updated to "under_review"');

      console.log('\n📊 FINAL SCORE RESULT:');
      console.log(`   Score ID: ${existingScore._id}`);
      console.log(`   Total Score: ${existingScore.total_score}/100`);
      console.log(`   Grade: ${existingScore.grade || 'Not calculated'}`);
      console.log(`   Scored At: ${existingScore.scored_at.toLocaleString()}`);
      console.log(`   Comments: ${existingScore.comments}`);

      console.log('\n✅ SCORING WITHOUT LOCK TEST COMPLETED SUCCESSFULLY!');
      console.log('   Judges can now submit scores without acquiring locks first.');

    } catch (scoreError) {
      console.log('   ❌ Error submitting score:', scoreError.message);
      console.log('   Error details:', scoreError);
    }

    // Verify the score was saved
    console.log('\n🔍 VERIFYING SAVED SCORE:');
    const savedScore = await Score.findOne({
      application_id: testApplication._id,
      judge_id: judge._id
    });

    if (savedScore) {
      console.log('   ✅ Score verified in database');
      console.log(`   Total: ${savedScore.total_score}/100`);
      console.log(`   Grade: ${savedScore.grade || 'Not calculated'}`);
    } else {
      console.log('   ❌ Score not found in database');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

testNoLockScoring();
