const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function checkVeryRecent() {
  try {
    console.log('🔍 CHECKING FOR VERY RECENT APPLICATIONS\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get applications created in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const Application = require('./models/Application');
    
    const recentApps = await Application.find({
      createdAt: { $gte: tenMinutesAgo }
    }).sort('-createdAt');

    console.log(`📊 Applications created in last 10 minutes: ${recentApps.length}\n`);
    
    if (recentApps.length === 0) {
      console.log('❌ No applications created in the last 10 minutes');
      
      // Check the last 5 applications regardless of time
      console.log('\n🔍 Checking last 5 applications created:\n');
      const lastFive = await Application.find()
        .sort('-createdAt')
        .limit(5)
        .select('business_name createdAt workflow_stage');
      
      lastFive.forEach((app, index) => {
        const timeAgo = Math.floor((Date.now() - app.createdAt.getTime()) / (1000 * 60));
        console.log(`${index + 1}. ${app.business_name}`);
        console.log(`   Created: ${app.createdAt.toLocaleString()}`);
        console.log(`   Time ago: ${timeAgo} minutes`);
        console.log(`   Stage: ${app.workflow_stage}`);
        console.log('   ---');
      });
      
    } else {
      recentApps.forEach((app, index) => {
        const timeAgo = Math.floor((Date.now() - app.createdAt.getTime()) / (1000 * 60));
        console.log(`${index + 1}. ${app.business_name}`);
        console.log(`   ID: ${app._id}`);
        console.log(`   Created: ${app.createdAt.toLocaleString()}`);
        console.log(`   Time ago: ${timeAgo} minutes`);
        console.log(`   Stage: ${app.workflow_stage}`);
        console.log('   ---');
      });
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

checkVeryRecent();
