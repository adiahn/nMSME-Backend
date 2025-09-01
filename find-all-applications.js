const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function findAllApplications() {
  try {
    console.log('🔍 FINDING ALL APPLICATIONS IN THE SYSTEM\n');
    console.log('=' .repeat(80));
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // Get ALL applications with full details
    const Application = require('./models/Application');
    const allApps = await Application.find()
      .sort('-createdAt')
      .lean(); // Use lean() for better performance

    console.log(`📊 TOTAL APPLICATIONS FOUND: ${allApps.length}\n`);

    if (allApps.length === 0) {
      console.log('❌ No applications found in the database');
      return;
    }

    // Display each application with full details
    allApps.forEach((app, index) => {
      console.log(`\n${'=' .repeat(60)}`);
      console.log(`📋 APPLICATION ${index + 1} OF ${allApps.length}`);
      console.log(`${'=' .repeat(60)}`);
      
      console.log(`🆔 Application ID: ${app._id}`);
      console.log(`🏢 Business Name: ${app.business_name}`);
      console.log(`📂 Category: ${app.category}`);
      console.log(`🏭 Sector: ${app.sector}`);
      console.log(`📊 MSME Strata: ${app.msme_strata}`);
      console.log(`📍 Location: ${app.location?.state || 'N/A'}, ${app.location?.lga || 'N/A'}`);
      console.log(`📅 Year Established: ${app.year_established}`);
      console.log(`👥 Employee Count: ${app.employee_count}`);
      console.log(`💰 Revenue Band: ${app.revenue_band}`);
      console.log(`📝 Workflow Stage: ${app.workflow_stage}`);
      console.log(`📅 Created: ${app.createdAt ? new Date(app.createdAt).toLocaleString() : 'N/A'}`);
      console.log(`📅 Updated: ${app.updatedAt ? new Date(app.updatedAt).toLocaleString() : 'N/A'}`);
      
      // Documents info
      if (app.documents && app.documents.length > 0) {
        console.log(`📎 Documents (${app.documents.length}):`);
        app.documents.forEach((doc, docIndex) => {
          console.log(`   ${docIndex + 1}. ${doc.document_type || 'Unknown'} - ${doc.filename || 'No filename'}`);
        });
      } else {
        console.log(`📎 Documents: None`);
      }
      
      // Pitch video info
      if (app.pitch_video) {
        console.log(`🎥 Pitch Video: ${app.pitch_video.url || 'No URL'} (${app.pitch_video.platform || 'No platform'})`);
      } else {
        console.log(`🎥 Pitch Video: None`);
      }
      
      // Additional details
      console.log(`📈 Jobs Created: ${app.jobs_created || 'N/A'}`);
      console.log(`👩‍💼 Women/Youth %: ${app.women_youth_percentage || 'N/A'}%`);
      console.log(`🌍 Has Exports: ${app.export_activity?.has_exports || 'N/A'}`);
      console.log(`♻️ Has Sustainability: ${app.sustainability_initiatives?.has_initiatives || 'N/A'}`);
      
      console.log(`\n${'=' .repeat(60)}`);
    });

    // Summary statistics
    console.log(`\n📊 SUMMARY STATISTICS:`);
    console.log(`   Total Applications: ${allApps.length}`);
    
    // Count by workflow stage
    const stageCounts = {};
    allApps.forEach(app => {
      const stage = app.workflow_stage || 'unknown';
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });
    
    console.log(`   By Workflow Stage:`);
    Object.entries(stageCounts).forEach(([stage, count]) => {
      console.log(`     ${stage}: ${count}`);
    });
    
    // Count by category
    const categoryCounts = {};
    allApps.forEach(app => {
      const category = app.category || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    console.log(`   By Category:`);
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`     ${category}: ${count}`);
    });

    // Recent applications (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentApps = allApps.filter(app => app.createdAt > oneDayAgo);
    
    if (recentApps.length > 0) {
      console.log(`\n🕐 Recent Applications (Last 24 hours): ${recentApps.length}`);
      recentApps.forEach(app => {
        const timeAgo = Math.floor((Date.now() - new Date(app.createdAt).getTime()) / (1000 * 60));
        console.log(`   - ${app.business_name} (${timeAgo} minutes ago)`);
      });
    }

    mongoose.connection.close();
    console.log(`\n✅ Database connection closed`);
    
  } catch (error) {
    console.error('❌ Error finding applications:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

findAllApplications();
