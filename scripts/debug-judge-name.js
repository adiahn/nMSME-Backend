const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function debugJudgeName() {
  try {
    console.log('🔍 DEBUGGING JUDGE NAME ISSUE\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Score = require('../models/Score');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Get the score for Communication application
    const score = await Score.findOne({
      application_id: '68be9c5c4ab9a33350ee8e88'
    });

    if (!score) {
      console.log('❌ No score found for Communication application');
      return;
    }

    console.log('📊 SCORE DETAILS:');
    console.log(`   Score ID: ${score._id}`);
    console.log(`   Judge ID: ${score.judge_id}`);
    console.log(`   Total Score: ${score.total_score}`);

    // Check if judge exists
    const judge = await Judge.findById(score.judge_id);
    console.log('\n👨‍⚖️ JUDGE DETAILS:');
    if (judge) {
      console.log(`   Judge ID: ${judge._id}`);
      console.log(`   User ID: ${judge.user_id}`);
      console.log(`   Is Active: ${judge.is_active}`);
    } else {
      console.log('   ❌ Judge not found');
      return;
    }

    // Check if user exists
    const user = await User.findById(judge.user_id);
    console.log('\n👤 USER DETAILS:');
    if (user) {
      console.log(`   User ID: ${user._id}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
    } else {
      console.log('   ❌ User not found');
      return;
    }

    // Test population
    console.log('\n🧪 TESTING POPULATION:');
    const populatedScore = await Score.findOne({
      application_id: '68be9c5c4ab9a33350ee8e88'
    })
    .populate({
      path: 'judge_id',
      populate: {
        path: 'user_id',
        select: 'first_name last_name'
      }
    });

    console.log('   Populated Score:');
    console.log(`   Judge ID: ${populatedScore.judge_id}`);
    if (populatedScore.judge_id) {
      console.log(`   Judge User ID: ${populatedScore.judge_id.user_id}`);
      if (populatedScore.judge_id.user_id) {
        console.log(`   Judge Name: ${populatedScore.judge_id.user_id.first_name} ${populatedScore.judge_id.user_id.last_name}`);
      } else {
        console.log('   ❌ Judge user_id not populated');
      }
    } else {
      console.log('   ❌ Judge not populated');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

debugJudgeName();
