const mongoose = require('mongoose');
const Application = require('../models/Application');
const User = require('../models/User');
const Score = require('../models/Score');
require('dotenv').config({ path: './config.env' });

async function checkDatabaseConnection() {
  try {
    console.log('🔍 Checking Database Connection...\n');

    // Show environment variables
    console.log('1️⃣ Environment Variables:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
    if (process.env.MONGODB_URI) {
      // Extract database name from URI
      const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0];
      console.log(`   Database Name: ${dbName}`);
    }

    // Connect to MongoDB
    console.log('\n2️⃣ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('   ✅ Connected to MongoDB successfully');

    // Check connection details
    console.log('\n3️⃣ Connection Details:');
    console.log(`   Connection State: ${mongoose.connection.readyState}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);
    console.log(`   Database Name: ${mongoose.connection.name}`);
    console.log(`   Connection String: ${mongoose.connection._connectionString}`);

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
      console.log('\n6️⃣ Sample Applications:');
      const sampleApps = await Application.find()
        .limit(5)
        .select('_id business_name category workflow_stage createdAt')
        .sort({ createdAt: -1 });
      
      sampleApps.forEach((app, index) => {
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
        });
      }
    }

    // Check if we're in the right database
    console.log('\n8️⃣ Database Verification:');
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
checkDatabaseConnection();

