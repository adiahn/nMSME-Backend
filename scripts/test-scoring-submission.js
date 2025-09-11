const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testScoringSubmission() {
  try {
    console.log('🧪 TESTING SCORING SUBMISSION\n');
    
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

    // Check the specific application
    const applicationId = '68be9c5c4ab9a33350ee8e88';
    const application = await Application.findById(applicationId)
      .populate('user_id', 'first_name last_name email');

    if (!application) {
      console.log('❌ Application not found with ID:', applicationId);
      return;
    }

    console.log('📋 APPLICATION DETAILS:');
    console.log(`   ID: ${application._id}`);
    console.log(`   Business Name: ${application.business_name}`);
    console.log(`   Sector: ${application.sector}`);
    console.log(`   Category: ${application.category}`);
    console.log(`   Workflow Stage: ${application.workflow_stage}`);
    console.log(`   Status: ${application.status}`);
    console.log(`   Applicant: ${application.user_id.first_name} ${application.user_id.last_name}`);
    console.log(`   Email: ${application.user_id.email}\n`);

    // Get Judge One
    const judge = await Judge.findOne({ 
      'user_id.email': 'judge.one@nmsme-awards.com' 
    }).populate('user_id', 'first_name last_name email');

    if (!judge) {
      console.log('❌ Judge One not found');
      return;
    }

    console.log('👨‍⚖️ JUDGE DETAILS:');
    console.log(`   Name: ${judge.user_id.first_name} ${judge.user_id.last_name}`);
    console.log(`   Email: ${judge.user_id.email}`);
    console.log(`   Judge ID: ${judge._id}`);
    console.log(`   Expertise: ${judge.expertise_sectors.join(', ')}\n`);

    // Check if there's an active lock
    const activeLock = await ApplicationLock.findOne({
      application_id: applicationId,
      judge_id: judge._id,
      is_active: true
    });

    console.log('🔒 LOCK STATUS:');
    if (activeLock) {
      console.log(`   ✅ Active lock found`);
      console.log(`   Locked at: ${activeLock.locked_at.toLocaleString()}`);
      console.log(`   Expires at: ${activeLock.expires_at.toLocaleString()}`);
      console.log(`   Time remaining: ${activeLock.time_remaining_minutes || 'N/A'} minutes`);
      console.log(`   Lock type: ${activeLock.lock_type}`);
    } else {
      console.log(`   ❌ No active lock found`);
      console.log(`   Creating a lock for testing...`);
      
      // Create a lock for testing
      const lockResult = await ApplicationLock.acquireLock(
        applicationId,
        judge._id,
        judge.user_id._id,
        'review',
        'test-session-' + Date.now(),
        60 // 60 minutes
      );

      if (lockResult.success) {
        console.log(`   ✅ Lock created successfully`);
        console.log(`   Expires at: ${lockResult.expires_at}`);
      } else {
        console.log(`   ❌ Failed to create lock: ${lockResult.error}`);
        return;
      }
    }

    // Check existing scores
    const existingScores = await Score.find({
      application_id: applicationId,
      judge_id: judge._id
    });

    console.log('\n📊 EXISTING SCORES:');
    if (existingScores.length === 0) {
      console.log('   No existing scores found');
    } else {
      existingScores.forEach((score, index) => {
        console.log(`   Score ${index + 1}: ${score.total_score}/100 (${score.grade || 'N/A'})`);
        console.log(`   Scored at: ${score.scored_at.toLocaleString()}`);
      });
    }

    // Test score submission
    console.log('\n🧪 TESTING SCORE SUBMISSION:');
    
    const testScore = {
      criteria_scores: {
        business_viability_financial_health: 18,
        market_opportunity_traction: 15,
        social_impact_job_creation: 12,
        innovation_technology_adoption: 10,
        sustainability_environmental_impact: 6,
        management_leadership: 7
      },
      overall_score: 68,
      comments: "Good business model with solid market potential. Shows innovation in communication technology. Room for improvement in sustainability practices.",
      recommendations: "Consider implementing more sustainable business practices and expanding market reach.",
      review_notes: "Test score submission for Communication application"
    };

    console.log('   Submitting test score...');
    console.log('   Score data:', JSON.stringify(testScore, null, 2));

    try {
      // Create or update score
      let score = await Score.findOne({
        application_id: applicationId,
        judge_id: judge._id
      });

      if (score) {
        // Update existing score
        score.criteria_scores = testScore.criteria_scores;
        score.total_score = testScore.overall_score;
        score.comments = testScore.comments;
        score.recommendations = testScore.recommendations;
        score.review_notes = testScore.review_notes;
        score.updated_at = new Date();
        await score.save();
        console.log('   ✅ Score updated successfully');
      } else {
        // Create new score
        score = await Score.create({
          application_id: applicationId,
          judge_id: judge._id,
          business_viability_financial_health: testScore.criteria_scores.business_viability_financial_health,
          market_opportunity_traction: testScore.criteria_scores.market_opportunity_traction,
          social_impact_job_creation: testScore.criteria_scores.social_impact_job_creation,
          innovation_technology_adoption: testScore.criteria_scores.innovation_technology_adoption,
          sustainability_environmental_impact: testScore.criteria_scores.sustainability_environmental_impact,
          management_leadership: testScore.criteria_scores.management_leadership,
          total_score: testScore.overall_score,
          comments: testScore.comments,
          review_notes: testScore.review_notes,
          scored_at: new Date()
        });
        console.log('   ✅ Score created successfully');
      }

      // Release the lock
      await ApplicationLock.releaseLock(applicationId, judge._id);
      console.log('   ✅ Lock released successfully');

      // Update application status
      application.workflow_stage = 'reviewed';
      await application.save();
      console.log('   ✅ Application status updated to "reviewed"');

      console.log('\n📊 FINAL SCORE DETAILS:');
      console.log(`   Score ID: ${score._id}`);
      console.log(`   Total Score: ${score.total_score}/100`);
      console.log(`   Grade: ${score.grade || 'Not calculated'}`);
      console.log(`   Scored At: ${score.scored_at.toLocaleString()}`);
      console.log(`   Comments: ${score.comments}`);
      console.log(`   Recommendations: ${score.recommendations || 'N/A'}`);

      console.log('\n✅ SCORING SUBMISSION TEST COMPLETED SUCCESSFULLY!');

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

testScoringSubmission();
