const mongoose = require('mongoose');
const Application = require('../models/Application');
const User = require('../models/User');
const Score = require('../models/Score');
require('dotenv').config({ path: './config.env' });

async function checkProductionDatabase() {
  try {
    console.log('🔍 Checking Production Database...\n');

    // Construct the correct MongoDB URI with database name
    const baseUri = 'mongodb+srv://admin:admin123@cluster0.0xw4ojd.mongodb.net/';
    const dbName = process.env.DB_NAME || 'nmsme_awards';
    const correctUri = `${baseUri}${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
    
    console.log('1️⃣ Database Configuration:');
    console.log(`   Base URI: ${baseUri}`);
    console.log(`   Database Name: ${dbName}`);
    console.log(`   Full URI: ${correctUri}`);

    // Connect to the correct database
    console.log('\n2️⃣ Connecting to Production Database...');
    await mongoose.connect(correctUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('   ✅ Connected to production database successfully');

    // Check connection details
    console.log('\n3️⃣ Connection Details:');
    console.log(`   Connection State: ${mongoose.connection.readyState}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);
    console.log(`   Database Name: ${mongoose.connection.name}`);

    // List all collections
    console.log('\n4️⃣ Database Collections:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   Found ${collections.length} collections:`);
    collections.forEach((collection, index) => {
      console.log(`   ${index + 1}. ${collection.name}`);
    });

    // Check each collection for documents
    console.log('\n5️⃣ Collection Document Counts:');
    
    // Applications
    const appCount = await Application.countDocuments();
    console.log(`   Applications: ${appCount}`);
    
    // Users
    const userCount = await User.countDocuments();
    console.log(`   Users: ${userCount}`);
    
    // Scores
    const scoreCount = await Score.countDocuments();
    console.log(`   Scores: ${scoreCount}`);

    // If there are applications, show some details
    if (appCount > 0) {
      console.log('\n6️⃣ Recent Applications:');
      const recentApps = await Application.find()
        .limit(10)
        .select('_id business_name category workflow_stage createdAt')
        .sort({ createdAt: -1 });
      
      recentApps.forEach((app, index) => {
        console.log(`   ${index + 1}. ${app.business_name}`);
        console.log(`      ID: ${app._id}`);
        console.log(`      Category: ${app.category}`);
        console.log(`      Stage: ${app.workflow_stage}`);
        console.log(`      Created: ${app.createdAt}`);
        console.log('');
      });

      // Search specifically for Velixify
      console.log('7️⃣ Searching for Velixify specifically:');
      const velixifyApps = await Application.find({
        business_name: { $regex: /velixify/i }
      });
      console.log(`   Found ${velixifyApps.length} Velixify applications`);
      
      if (velixifyApps.length > 0) {
        velixifyApps.forEach((app, index) => {
          console.log(`   ${index + 1}. ${app.business_name} (ID: ${app._id})`);
          console.log(`      Category: ${app.category}`);
          console.log(`      Stage: ${app.workflow_stage}`);
          console.log(`      Created: ${app.createdAt}`);
        });
      }

      // Search for the specific ID that was requested earlier
      console.log('\n8️⃣ Searching for specific ID: 68baf2481debf5776a661df0');
      const specificApp = await Application.findById('68baf2481debf5776a661df0');
      if (specificApp) {
        console.log('   ✅ Found the specific application:');
        console.log(`   - Business Name: ${specificApp.business_name}`);
        console.log(`   - Category: ${specificApp.category}`);
        console.log(`   - Stage: ${specificApp.workflow_stage}`);
      } else {
        console.log('   ❌ Specific application not found');
      }
    } else {
      console.log('\n6️⃣ No applications found in production database');
    }

    // Database stats
    console.log('\n9️⃣ Database Statistics:');
    const dbStats = await mongoose.connection.db.stats();
    console.log(`   Database Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Collections: ${dbStats.collections}`);
    console.log(`   Documents: ${dbStats.objects}`);

  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.error('Error details:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkProductionDatabase();

