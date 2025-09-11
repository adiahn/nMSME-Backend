const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testCommunicationScoring() {
  try {
    console.log('🧪 TESTING COMMUNICATION APPLICATION SCORING\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Score = require('../models/Score');
    const Judge = require('../models/Judge');
    const User = require('../models/User');
    const ApplicationLock = require('../models/ApplicationLock');

    // Application details
    const applicationId = '68be9c5c4ab9a33350ee8e88';
    const application = await Application.findById(applicationId)
      .populate('user_id', 'first_name last_name email');

    console.log('📋 APPLICATION:');
    console.log(`   Name: ${application.business_name}`);
    console.log(`   Sector: ${application.sector}`);
    console.log(`   Applicant: ${application.user_id.first_name} ${application.user_id.last_name}`);
    console.log(`   Current Stage: ${application.workflow_stage}\n`);

    // Get Judge One
    let judge = await Judge.findOne({ 
      'user_id.email': 'judge.one@nmsme-awards.com' 
    }).populate('user_id', 'first_name last_name email');

    if (!judge) {
      console.log('❌ Judge One not found, looking for any active judge...');
      const anyJudge = await Judge.findOne({ is_active: true }).populate('user_id', 'first_name last_name email');
      if (!anyJudge) {
        console.log('❌ No active judges found');
        return;
      }
      console.log('👨‍⚖️ USING JUDGE:');
      console.log(`   Name: ${anyJudge.user_id.first_name} ${anyJudge.user_id.last_name}`);
      console.log(`   Email: ${anyJudge.user_id.email}\n`);
      judge = anyJudge;
    } else {
      console.log('👨‍⚖️ JUDGE:');
      console.log(`   Name: ${judge.user_id.first_name} ${judge.user_id.last_name}`);
      console.log(`   Email: ${judge.user_id.email}\n`);
    }

    // Check existing lock
    const existingLock = await ApplicationLock.findOne({
      application_id: applicationId,
      is_active: true
    });

    console.log('🔒 LOCK STATUS:');
    if (existingLock) {
      console.log(`   ✅ Active lock found`);
      console.log(`   Locked by: ${existingLock.judge_id}`);
      console.log(`   Expires: ${existingLock.expires_at.toLocaleString()}`);
      console.log(`   Time remaining: ${existingLock.time_remaining_minutes || 'N/A'} minutes`);
    } else {
      console.log(`   ❌ No active lock found`);
    }

    // Test score submission
    console.log('\n🧪 TESTING SCORE SUBMISSION:');
    
    const testScoreData = {
      criteria_scores: {
        business_viability_financial_health: 20,
        market_opportunity_traction: 16,
        social_impact_job_creation: 18,
        innovation_technology_adoption: 12,
        sustainability_environmental_impact: 8,
        management_leadership: 9
      },
      overall_score: 83,
      comments: "Excellent communication business with strong market potential and good social impact. Shows innovation in agribusiness communication solutions.",
      recommendations: "Consider expanding to rural areas and implementing more sustainable practices.",
      review_notes: "Test score submission for Communication application - comprehensive review completed"
    };

    console.log('   Score data:', JSON.stringify(testScoreData, null, 2));

    try {
      // Check if score already exists
      let existingScore = await Score.findOne({
        application_id: applicationId,
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
          application_id: applicationId,
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

      // Release any active locks
      if (existingLock) {
        await ApplicationLock.releaseLock(applicationId, judge._id);
        console.log('   ✅ Lock released successfully');
      }

      // Update application status
      application.workflow_stage = 'under_review';
      await application.save();
      console.log('   ✅ Application status updated to "under_review"');

      console.log('\n📊 FINAL SCORE RESULT:');
      console.log(`   Score ID: ${existingScore._id}`);
      console.log(`   Total Score: ${existingScore.total_score}/100`);
      console.log(`   Grade: ${existingScore.grade || 'Not calculated'}`);
      console.log(`   Scored At: ${existingScore.scored_at.toLocaleString()}`);
      console.log(`   Comments: ${existingScore.comments}`);
      console.log(`   Recommendations: ${existingScore.recommendations || 'N/A'}`);

      console.log('\n✅ SCORING SUBMISSION TEST COMPLETED SUCCESSFULLY!');
      console.log('   The Communication application has been scored and reviewed.');

    } catch (scoreError) {
      console.log('   ❌ Error submitting score:', scoreError.message);
      console.log('   Error details:', scoreError);
    }

    // Verify the score was saved
    console.log('\n🔍 VERIFYING SAVED SCORE:');
    const savedScore = await Score.findOne({
      application_id: applicationId,
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

testCommunicationScoring();
