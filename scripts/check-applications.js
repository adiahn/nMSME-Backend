const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Import the Application model
const Application = require('./models/Application');

async function checkApplications() {
  try {
    console.log('🔍 CHECKING APPLICATIONS IN DATABASE\n');
    console.log('=' .repeat(60));

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // Check total applications count
    const totalApplications = await Application.countDocuments();
    console.log(`📊 Total Applications in Database: ${totalApplications}\n`);

    if (totalApplications === 0) {
      console.log('❌ NO APPLICATIONS FOUND IN DATABASE');
      console.log('This explains why the judge dashboard shows 0 applications.');
      console.log('\n💡 Possible reasons:');
      console.log('1. Database was reset/cleared');
      console.log('2. Applications were created in a different environment');
      console.log('3. Database connection string changed');
      console.log('4. Applications exist in a different collection');
      console.log('5. Data migration failed');
    } else {
      // Get all applications with basic details
      const applications = await Application.find({})
        .select('business_name category workflow_stage created_at user_id')
        .populate('user_id', 'first_name last_name email')
        .sort({ created_at: -1 });

      console.log('📋 APPLICATIONS FOUND:');
      console.log('-' .repeat(40));

      applications.forEach((app, index) => {
        console.log(`${index + 1}. Business: ${app.business_name || 'No name'}`);
        console.log(`   Category: ${app.category || 'No category'}`);
        console.log(`   Workflow Stage: ${app.workflow_stage || 'No stage'}`);
        console.log(`   Created: ${app.created_at || 'No date'}`);
        if (app.user_id) {
          console.log(`   User: ${app.user_id.first_name} ${app.user_id.last_name} (${app.user_id.email})`);
        }
        console.log(`   ID: ${app._id}`);
        console.log();
      });

      // Check workflow stage distribution
      console.log('📊 WORKFLOW STAGE DISTRIBUTION:');
      console.log('-' .repeat(40));
      
      const stageCounts = await Application.aggregate([
        { $group: { _id: '$workflow_stage', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      stageCounts.forEach(stage => {
        console.log(`${stage._id || 'No stage'}: ${stage.count} applications`);
      });

      // Check category distribution
      console.log('\n📊 CATEGORY DISTRIBUTION:');
      console.log('-' .repeat(40));
      
      const categoryCounts = await Application.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      categoryCounts.forEach(category => {
        console.log(`${category._id || 'No category'}: ${category.count} applications`);
      });
    }

    // Check if there are any other collections that might contain application data
    console.log('\n🔍 CHECKING OTHER COLLECTIONS:');
    console.log('-' .repeat(40));

    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    console.log('Available collections:');
    collectionNames.forEach(name => {
      console.log(`   - ${name}`);
    });

    // Check if there are any documents in other relevant collections
    if (collectionNames.includes('businessprofiles')) {
      const BusinessProfile = require('./models/BusinessProfile');
      const businessProfiles = await BusinessProfile.countDocuments();
      console.log(`\n📊 Business Profiles: ${businessProfiles}`);
    }

    if (collectionNames.includes('users')) {
      try {
        const User = require('./models/User');
        const users = await User.countDocuments();
        console.log(`📊 Users: ${users}`);
      } catch (error) {
        console.log(`📊 Users: Error - ${error.message}`);
      }
    }

    if (collectionNames.includes('judges')) {
      const Judge = require('./models/Judge');
      const judges = await Judge.countDocuments();
      console.log(`📊 Judges: ${judges}`);
    }

  } catch (error) {
    console.error('❌ Error checking applications:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('Database connection failed. Check your MONGODB_URI in config.env');
    }
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the check
checkApplications();
