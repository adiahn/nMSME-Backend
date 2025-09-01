const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function investigateApplications() {
  try {
    console.log('🔍 INVESTIGATING APPLICATIONS - MULTIPLE APPROACHES\n');
    console.log('=' .repeat(80));
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');
    console.log(`🔗 Connection String: ${process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    console.log(`🏠 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`📊 Collections: ${(await mongoose.connection.db.listCollections().toArray()).map(c => c.name).join(', ')}`);
    console.log('');

    // Get the Application model
    const Application = require('./models/Application');
    
    // Approach 1: Direct find
    console.log('🔍 APPROACH 1: Direct Application.find()');
    const directApps = await Application.find();
    console.log(`   Found: ${directApps.length} applications`);
    console.log('');

    // Approach 2: Count documents
    console.log('🔍 APPROACH 2: Application.countDocuments()');
    const count = await Application.countDocuments();
    console.log(`   Count: ${count} applications`);
    console.log('');

    // Approach 3: Check specific application by business name
    console.log('🔍 APPROACH 3: Search for your specific application');
    const yourApp = await Application.findOne({ business_name: 'Adnan' });
    if (yourApp) {
      console.log(`   ✅ Found your application: ${yourApp.business_name}`);
      console.log(`   ID: ${yourApp._id}`);
      console.log(`   Created: ${yourApp.createdAt}`);
    } else {
      console.log(`   ❌ Application with business name 'Adnan' not found`);
    }
    console.log('');

    // Approach 4: Check by recent creation time
    console.log('🔍 APPROACH 4: Check applications created in last 2 hours');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentApps = await Application.find({ createdAt: { $gte: twoHoursAgo } });
    console.log(`   Found: ${recentApps.length} applications in last 2 hours`);
    if (recentApps.length > 0) {
      recentApps.forEach(app => {
        console.log(`   - ${app.business_name} (${app.createdAt})`);
      });
    }
    console.log('');

    // Approach 5: Check all applications with detailed info
    console.log('🔍 APPROACH 5: All applications with details');
    const allApps = await Application.find().sort('-createdAt');
    console.log(`   Total: ${allApps.length} applications`);
    
    if (allApps.length > 0) {
      allApps.forEach((app, index) => {
        console.log(`   ${index + 1}. ${app.business_name}`);
        console.log(`      ID: ${app._id}`);
        console.log(`      Category: ${app.category}`);
        console.log(`      Created: ${app.createdAt}`);
        console.log(`      Stage: ${app.workflow_stage}`);
        console.log('');
      });
    }

    // Approach 6: Check if there are any database issues
    console.log('🔍 APPROACH 6: Database health check');
    try {
      const stats = await mongoose.connection.db.stats();
      console.log(`   Database size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Collections: ${stats.collections}`);
      console.log(`   Documents: ${stats.objects}`);
    } catch (error) {
      console.log(`   ❌ Could not get database stats: ${error.message}`);
    }

    // Approach 7: Check if applications might be in a different collection
    console.log('\n🔍 APPROACH 7: Check all collections for applications');
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      if (collection.name.toLowerCase().includes('application') || collection.name.toLowerCase().includes('app')) {
        console.log(`   Checking collection: ${collection.name}`);
        try {
          const count = await mongoose.connection.db.collection(collection.name).countDocuments();
          console.log(`     Documents: ${count}`);
          if (count > 0) {
            const sample = await mongoose.connection.db.collection(collection.name).findOne();
            console.log(`     Sample document keys: ${Object.keys(sample || {}).join(', ')}`);
          }
        } catch (error) {
          console.log(`     ❌ Error: ${error.message}`);
        }
      }
    }

    mongoose.connection.close();
    console.log('\n✅ Investigation complete');
    
  } catch (error) {
    console.error('❌ Investigation error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

investigateApplications();
