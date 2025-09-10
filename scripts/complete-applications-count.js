const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function getCompleteApplicationsCount() {
  try {
    console.log('📊 COMPLETE APPLICATIONS DATABASE ANALYSIS\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');

    // Get total count
    const totalApplications = await Application.countDocuments();
    console.log(`📈 TOTAL APPLICATIONS: ${totalApplications}\n`);

    // Get applications by category
    console.log('📋 APPLICATIONS BY CATEGORY:');
    const byCategory = await Application.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    byCategory.forEach((item, index) => {
      console.log(`${index + 1}. ${item._id}: ${item.count} applications`);
    });

    // Get applications by sector
    console.log('\n📋 APPLICATIONS BY SECTOR:');
    const bySector = await Application.aggregate([
      { $group: { _id: '$sector', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    bySector.forEach((item, index) => {
      console.log(`${index + 1}. ${item._id}: ${item.count} applications`);
    });

    // Get applications by workflow stage
    console.log('\n📋 APPLICATIONS BY WORKFLOW STAGE:');
    const byStage = await Application.aggregate([
      { $group: { _id: '$workflow_stage', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    byStage.forEach((item, index) => {
      console.log(`${index + 1}. ${item._id}: ${item.count} applications`);
    });

    // Get applications by MSME strata
    console.log('\n📋 APPLICATIONS BY MSME STRATA:');
    const byStrata = await Application.aggregate([
      { $group: { _id: '$msme_strata', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    byStrata.forEach((item, index) => {
      console.log(`${index + 1}. ${item._id}: ${item.count} applications`);
    });

    // Get applications by state
    console.log('\n📋 APPLICATIONS BY STATE:');
    const byState = await Application.aggregate([
      { $group: { _id: '$location.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    byState.forEach((item, index) => {
      console.log(`${index + 1}. ${item._id}: ${item.count} applications`);
    });

    // Check for category/sector mismatches
    console.log('\n⚠️  CATEGORY/SECTOR MISMATCHES:');
    const mismatchedApps = await Application.find({
      $expr: { $ne: ['$category', '$sector'] }
    }).select('business_name category sector workflow_stage createdAt');
    
    console.log(`Found ${mismatchedApps.length} applications with category/sector mismatches:`);
    mismatchedApps.forEach((app, index) => {
      console.log(`${index + 1}. ${app.business_name}`);
      console.log(`   Category: ${app.category}`);
      console.log(`   Sector: ${app.sector}`);
      console.log(`   Stage: ${app.workflow_stage}`);
      console.log(`   Created: ${app.createdAt.toLocaleString()}`);
      console.log('');
    });

    // Get recent applications (last 10)
    console.log('📅 RECENT APPLICATIONS (Last 10):');
    const recentApps = await Application.find()
      .select('business_name category sector workflow_stage createdAt')
      .sort('-createdAt')
      .limit(10);
    
    recentApps.forEach((app, index) => {
      console.log(`${index + 1}. ${app.business_name}`);
      console.log(`   Category: ${app.category}`);
      console.log(`   Sector: ${app.sector}`);
      console.log(`   Stage: ${app.workflow_stage}`);
      console.log(`   Created: ${app.createdAt.toLocaleString()}`);
      console.log('');
    });

    // Get applications with documents
    console.log('📄 APPLICATIONS WITH DOCUMENTS:');
    const withDocs = await Application.countDocuments({
      'documents.0': { $exists: true }
    });
    const withoutDocs = totalApplications - withDocs;
    console.log(`   With documents: ${withDocs} applications`);
    console.log(`   Without documents: ${withoutDocs} applications`);

    // Get applications with pitch videos
    console.log('\n🎥 APPLICATIONS WITH PITCH VIDEOS:');
    const withVideos = await Application.countDocuments({
      'pitch_video.url': { $exists: true, $ne: null }
    });
    const withoutVideos = totalApplications - withVideos;
    console.log(`   With pitch videos: ${withVideos} applications`);
    console.log(`   Without pitch videos: ${withoutVideos} applications`);

    // Get applications by creation date (daily breakdown for last 7 days)
    console.log('\n📅 APPLICATIONS BY CREATION DATE (Last 7 Days):');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const byDate = await Application.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { 
        _id: { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        }, 
        count: { $sum: 1 } 
      }},
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);
    
    byDate.forEach((item, index) => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      console.log(`${index + 1}. ${date.toLocaleDateString()}: ${item.count} applications`);
    });

    console.log('\n✅ Analysis complete!');
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

getCompleteApplicationsCount();
