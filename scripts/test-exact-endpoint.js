const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testExactEndpoint() {
  try {
    console.log('🧪 TESTING EXACT ENDPOINT WITH CORRECT DATA\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Score = require('../models/Score');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Test with the exact application ID from the logs
    const applicationId = '68b8d4e380b929bff1707aa7';
    console.log(`🔍 Testing with application ID: ${applicationId}`);

    // Check if application exists
    const application = await Application.findById(applicationId)
      .populate('user_id', 'first_name last_name email');

    if (!application) {
      console.log('❌ Application not found');
      return;
    }

    console.log('📋 APPLICATION FOUND:');
    console.log(`   Name: ${application.business_name}`);
    console.log(`   ID: ${application._id}`);
    console.log(`   Stage: ${application.workflow_stage}\n`);

    // Get a judge
    const judge = await Judge.findOne({ is_active: true })
      .populate('user_id', 'first_name last_name email');

    if (!judge) {
      console.log('❌ No active judge found');
      return;
    }

    console.log('👨‍⚖️ JUDGE FOUND:');
    console.log(`   Name: ${judge.user_id.first_name} ${judge.user_id.last_name}`);
    console.log(`   Email: ${judge.user_id.email}\n`);

    // Test with CORRECT field names (what backend expects)
    const correctTestData = {
      criteria_scores: {
        business_viability_financial_health: 20,    // ✅ Correct field name
        market_opportunity_traction: 16,            // ✅ Correct field name
        social_impact_job_creation: 18,             // ✅ Correct field name
        innovation_technology_adoption: 12,         // ✅ Correct field name
        sustainability_environmental_impact: 8,     // ✅ Correct field name
        management_leadership: 9                    // ✅ Correct field name
      },
      overall_score: 83,
      comments: "Test with correct field names",
      recommendations: "Test recommendations",
      review_notes: "Test review notes"
    };

    console.log('🧪 TESTING WITH CORRECT FIELD NAMES:');
    console.log('   Test data:', JSON.stringify(correctTestData, null, 2));

    try {
      // Simulate the exact scoring logic from the endpoint
      console.log('\n📊 SIMULATING SCORE SUBMISSION:');
      
      // Check if application exists and is available for review
      if (application.workflow_stage !== 'submitted' && application.workflow_stage !== 'under_review') {
        console.log('   ❌ Application is not available for review');
        return;
      }
      console.log('   ✅ Application is available for review');

      // Validate required fields (simulate backend validation)
      if (!correctTestData.criteria_scores) {
        console.log('   ❌ criteria_scores is required');
        return;
      }
      console.log('   ✅ criteria_scores is present');

      if (!correctTestData.overall_score) {
        console.log('   ❌ overall_score is required');
        return;
      }
      console.log('   ✅ overall_score is present');

      // Validate criteria_scores structure
      const requiredCriteria = [
        'business_viability_financial_health',
        'market_opportunity_traction', 
        'social_impact_job_creation',
        'innovation_technology_adoption',
        'sustainability_environmental_impact',
        'management_leadership'
      ];

      let validationPassed = true;
      for (const criterion of requiredCriteria) {
        if (correctTestData.criteria_scores[criterion] === undefined || correctTestData.criteria_scores[criterion] === null) {
          console.log(`   ❌ Missing required criteria: ${criterion}`);
          validationPassed = false;
        } else {
          console.log(`   ✅ ${criterion}: ${correctTestData.criteria_scores[criterion]}`);
        }
      }

      if (!validationPassed) {
        console.log('   ❌ Validation failed');
        return;
      }
      console.log('   ✅ All criteria validation passed');

      // Check if score already exists
      let score = await Score.findOne({
        application_id: applicationId,
        judge_id: judge._id
      });

      if (score) {
        console.log('   ⚠️  Score already exists, updating...');
        score.business_viability_financial_health = correctTestData.criteria_scores.business_viability_financial_health;
        score.market_opportunity_traction = correctTestData.criteria_scores.market_opportunity_traction;
        score.social_impact_job_creation = correctTestData.criteria_scores.social_impact_job_creation;
        score.innovation_technology_adoption = correctTestData.criteria_scores.innovation_technology_adoption;
        score.sustainability_environmental_impact = correctTestData.criteria_scores.sustainability_environmental_impact;
        score.management_leadership = correctTestData.criteria_scores.management_leadership;
        score.total_score = correctTestData.overall_score;
        score.comments = correctTestData.comments;
        score.recommendations = correctTestData.recommendations;
        score.review_notes = correctTestData.review_notes;
        score.updated_at = new Date();
        await score.save();
        console.log('   ✅ Score updated successfully');
      } else {
        console.log('   Creating new score...');
        const newScore = await Score.create({
          application_id: applicationId,
          judge_id: judge._id,
          business_viability_financial_health: correctTestData.criteria_scores.business_viability_financial_health,
          market_opportunity_traction: correctTestData.criteria_scores.market_opportunity_traction,
          social_impact_job_creation: correctTestData.criteria_scores.social_impact_job_creation,
          innovation_technology_adoption: correctTestData.criteria_scores.innovation_technology_adoption,
          sustainability_environmental_impact: correctTestData.criteria_scores.sustainability_environmental_impact,
          management_leadership: correctTestData.criteria_scores.management_leadership,
          total_score: correctTestData.overall_score,
          comments: correctTestData.comments,
          recommendations: correctTestData.recommendations,
          review_notes: correctTestData.review_notes,
          scored_at: new Date()
        });
        console.log('   ✅ Score created successfully');
        score = newScore;
      }

      // Update application status
      application.workflow_stage = 'under_review';
      await application.save();
      console.log('   ✅ Application status updated to "under_review"');

      console.log('\n📊 FINAL SCORE RESULT:');
      console.log(`   Score ID: ${score._id}`);
      console.log(`   Total Score: ${score.total_score}/100`);
      console.log(`   Grade: ${score.grade || 'Not calculated'}`);
      console.log(`   Scored At: ${score.scored_at.toLocaleString()}`);

      console.log('\n✅ TEST WITH CORRECT FIELD NAMES COMPLETED SUCCESSFULLY!');
      console.log('   The backend should accept this data format.');

    } catch (scoreError) {
      console.log('   ❌ Error submitting score:', scoreError.message);
      console.log('   Error details:', scoreError);
    }

    // Now test with WRONG field names (what frontend is sending)
    console.log('\n\n🧪 TESTING WITH WRONG FIELD NAMES (Frontend Format):');
    
    const wrongTestData = {
      criteria_scores: {
        innovation: 10,           // ❌ Wrong field name
        market_potential: 8,      // ❌ Wrong field name
        business_model: 7,        // ❌ Wrong field name
        team_strength: 6,         // ❌ Wrong field name
        financial_viability: 5    // ❌ Wrong field name
        // Missing management_leadership
      },
      overall_score: 36,
      comments: "Test with wrong field names",
      recommendations: "Test recommendations",
      review_notes: "Test review notes"
    };

    console.log('   Wrong test data:', JSON.stringify(wrongTestData, null, 2));

    // Simulate validation with wrong field names
    console.log('\n📊 SIMULATING VALIDATION WITH WRONG FIELD NAMES:');
    
    if (!wrongTestData.criteria_scores) {
      console.log('   ❌ criteria_scores is required');
    } else {
      console.log('   ✅ criteria_scores is present');
    }

    for (const criterion of requiredCriteria) {
      if (wrongTestData.criteria_scores[criterion] === undefined || wrongTestData.criteria_scores[criterion] === null) {
        console.log(`   ❌ Missing required criteria: ${criterion}`);
      } else {
        console.log(`   ✅ ${criterion}: ${wrongTestData.criteria_scores[criterion]}`);
      }
    }

    console.log('\n❌ VALIDATION WITH WRONG FIELD NAMES FAILED!');
    console.log('   This explains why the frontend gets "criteria_scores is required" error.');
    console.log('   The backend validation is working correctly - it expects specific field names.');

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

testExactEndpoint();
