const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testPublicReviewedRoutes() {
  try {
    console.log('🧪 TESTING PUBLIC REVIEWED APPLICATIONS ROUTES\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Score = require('../models/Score');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Test 1: Check reviewed applications
    console.log('📋 TEST 1: REVIEWED APPLICATIONS');
    const reviewedApps = await Application.find({
      workflow_stage: { $in: ['under_review', 'shortlisted', 'finalist', 'winner'] }
    })
    .populate('user_id', 'first_name last_name email')
    .sort('-updatedAt')
    .lean();

    console.log(`   Found ${reviewedApps.length} reviewed applications:`);
    reviewedApps.forEach((app, index) => {
      console.log(`   ${index + 1}. ${app.business_name} (${app.workflow_stage})`);
    });

    // Test 2: Check scores for reviewed applications
    console.log('\n📊 TEST 2: SCORES FOR REVIEWED APPLICATIONS');
    const applicationIds = reviewedApps.map(app => app._id);
    const scores = await Score.find({
      application_id: { $in: applicationIds }
    })
    .populate('judge_id', 'user_id')
    .populate('judge_id.user_id', 'first_name last_name')
    .lean();

    console.log(`   Found ${scores.length} scores:`);
    scores.forEach((score, index) => {
      console.log(`   ${index + 1}. ${score.total_score}/100 (${score.grade || 'N/A'}) - ${score.judge_id.user_id.first_name} ${score.judge_id.user_id.last_name}`);
    });

    // Test 3: Check Communication application specifically
    console.log('\n🔍 TEST 3: COMMUNICATION APPLICATION');
    const communicationApp = await Application.findById('68be9c5c4ab9a33350ee8e88')
      .populate('user_id', 'first_name last_name email');

    if (communicationApp) {
      console.log(`   Application: ${communicationApp.business_name}`);
      console.log(`   Stage: ${communicationApp.workflow_stage}`);
      console.log(`   Applicant: ${communicationApp.user_id.first_name} ${communicationApp.user_id.last_name}`);
      
      const communicationScores = await Score.find({
        application_id: communicationApp._id
      })
      .populate('judge_id', 'user_id')
      .populate('judge_id.user_id', 'first_name last_name');

      console.log(`   Scores: ${communicationScores.length}`);
      communicationScores.forEach((score, index) => {
        console.log(`     ${index + 1}. ${score.total_score}/100 (${score.grade || 'N/A'}) - ${score.judge_id.user_id.first_name} ${score.judge_id.user_id.last_name}`);
        console.log(`         Comments: ${score.comments}`);
      });
    } else {
      console.log('   Communication application not found');
    }

    // Test 4: Summary statistics
    console.log('\n📈 TEST 4: SUMMARY STATISTICS');
    
    // Stage distribution
    const stageCounts = await Application.aggregate([
      {
        $match: {
          workflow_stage: { $in: ['under_review', 'shortlisted', 'finalist', 'winner'] }
        }
      },
      {
        $group: {
          _id: '$workflow_stage',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('   Stage Distribution:');
    stageCounts.forEach(stage => {
      console.log(`     ${stage._id}: ${stage.count}`);
    });

    // Scoring statistics
    const scoringStats = await Score.aggregate([
      {
        $group: {
          _id: null,
          total_scores: { $sum: 1 },
          average_score: { $avg: '$total_score' },
          highest_score: { $max: '$total_score' },
          lowest_score: { $min: '$total_score' }
        }
      }
    ]);

    if (scoringStats[0]) {
      console.log('   Scoring Statistics:');
      console.log(`     Total Scores: ${scoringStats[0].total_scores}`);
      console.log(`     Average Score: ${Math.round(scoringStats[0].average_score * 100) / 100}`);
      console.log(`     Highest Score: ${scoringStats[0].highest_score}`);
      console.log(`     Lowest Score: ${scoringStats[0].lowest_score}`);
    }

    // Grade distribution
    const gradeDistribution = await Score.aggregate([
      {
        $group: {
          _id: '$grade',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('   Grade Distribution:');
    gradeDistribution.forEach(grade => {
      console.log(`     ${grade._id || 'No Grade'}: ${grade.count}`);
    });

    console.log('\n✅ PUBLIC ROUTES TEST COMPLETED SUCCESSFULLY!');
    console.log('\n🌐 PUBLIC ENDPOINTS AVAILABLE:');
    console.log('   GET /api/public/reviewed-applications');
    console.log('   GET /api/public/reviewed-applications/summary');
    console.log('   GET /api/public/check-application-status?business_name=NAME');
    console.log('   GET /api/public/check-application-status?email=EMAIL');

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

testPublicReviewedRoutes();
