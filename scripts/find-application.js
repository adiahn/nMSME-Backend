const mongoose = require('mongoose');
const Application = require('../models/Application');
require('dotenv').config({ path: './config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function findApplication() {
  try {
    console.log('🔍 Searching for Applications...\n');

    // Search for the specific ID
    console.log('1️⃣ Searching for specific ID: 68baf2481debf5776a661df0');
    const specificApp = await Application.findById('68baf2481debf5776a661df0');
    
    if (specificApp) {
      console.log('   ✅ Found application:');
      console.log(`   - ID: ${specificApp._id}`);
      console.log(`   - Business Name: ${specificApp.business_name}`);
      console.log(`   - Category: ${specificApp.category}`);
      console.log(`   - Workflow Stage: ${specificApp.workflow_stage}`);
      console.log(`   - Created: ${specificApp.createdAt}`);
    } else {
      console.log('   ❌ Application with that ID not found');
    }

    // Search for similar IDs (partial match)
    console.log('\n2️⃣ Searching for similar IDs...');
    const similarApps = await Application.find({
      _id: { $regex: /68baf2481debf5776a661df/i }
    });
    
    if (similarApps.length > 0) {
      console.log(`   Found ${similarApps.length} similar applications:`);
      similarApps.forEach((app, index) => {
        console.log(`   ${index + 1}. ID: ${app._id}, Business: ${app.business_name}, Stage: ${app.workflow_stage}`);
      });
    } else {
      console.log('   No similar IDs found');
    }

    // Get all applications (limited to recent ones)
    console.log('\n3️⃣ Recent applications in database:');
    const recentApps = await Application.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id business_name category workflow_stage createdAt');
    
    if (recentApps.length > 0) {
      console.log(`   Found ${recentApps.length} recent applications:`);
      recentApps.forEach((app, index) => {
        console.log(`   ${index + 1}. ID: ${app._id}`);
        console.log(`      Business: ${app.business_name}`);
        console.log(`      Category: ${app.category}`);
        console.log(`      Stage: ${app.workflow_stage}`);
        console.log(`      Created: ${app.createdAt}`);
        console.log('');
      });
    } else {
      console.log('   No applications found in database');
    }

    // Search by partial business name if you remember it
    console.log('\n4️⃣ You can also search by business name if you remember it');
    console.log('   To search by business name, modify this script and add:');
    console.log('   const appsByName = await Application.find({ business_name: { $regex: /your_business_name/i } });');

  } catch (error) {
    console.error('❌ Error searching for applications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the search
findApplication();

