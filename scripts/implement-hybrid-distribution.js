const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function implementHybridDistribution() {
  try {
    console.log('🎯 IMPLEMENTING HYBRID DISTRIBUTION SYSTEM\n');
    console.log('(Equal workload + Expertise matching)\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to MongoDB\n');

    const Application = require('../models/Application');
    const Judge = require('../models/Judge');
    const User = require('../models/User');

    // Get all applications
    const allApplications = await Application.find({ workflow_stage: 'submitted' })
      .select('_id business_name category sector workflow_stage createdAt')
      .sort('createdAt');

    // Get all active judges
    const judges = await Judge.find({ is_active: true })
      .populate('user_id', 'first_name last_name email')
      .sort('createdAt');

    console.log(`📊 Total applications: ${allApplications.length}`);
    console.log(`👨‍⚖️ Total active judges: ${judges.length}\n`);

    if (judges.length === 0) {
      console.log('❌ No active judges found');
      return;
    }

    // Map expertise to sectors
    const expertiseToSectorMap = {
      'fashion': 'Fashion',
      'it': 'Information Technology (IT)',
      'agribusiness': 'Agribusiness',
      'food_beverage': 'Food & Beverage',
      'light_manufacturing': 'Light Manufacturing',
      'creative_enterprise': 'Creative Enterprise',
      'nano_category': 'Emerging Enterprise Award',
      'emerging_enterprise': 'Emerging Enterprise Award'
    };

    // Step 1: Group applications by sector
    const applicationsBySector = {};
    allApplications.forEach(app => {
      if (!applicationsBySector[app.sector]) {
        applicationsBySector[app.sector] = [];
      }
      applicationsBySector[app.sector].push(app);
    });

    console.log('📋 APPLICATIONS BY SECTOR:');
    Object.entries(applicationsBySector).forEach(([sector, apps]) => {
      console.log(`${sector}: ${apps.length} applications`);
    });
    console.log('');

    // Step 2: Create judge expertise mapping
    const judgeExpertise = {};
    judges.forEach(judge => {
      const sectors = judge.expertise_sectors.map(sector => expertiseToSectorMap[sector]).filter(Boolean);
      judgeExpertise[judge._id] = {
        judge: judge,
        sectors: sectors,
        assignedApplications: [],
        totalApplications: 0
      };
    });

    // Step 3: First pass - assign applications to judges with matching expertise
    console.log('🎯 STEP 1: Assigning applications to matching expertise judges...\n');
    
    Object.entries(applicationsBySector).forEach(([sector, apps]) => {
      // Find judges with this sector expertise
      const qualifiedJudges = Object.entries(judgeExpertise)
        .filter(([judgeId, data]) => data.sectors.includes(sector))
        .map(([judgeId, data]) => ({ judgeId, ...data }));

      if (qualifiedJudges.length === 0) {
        console.log(`⚠️  No judges found for sector: ${sector}`);
        return;
      }

      // Distribute applications among qualified judges
      const appsPerJudge = Math.floor(apps.length / qualifiedJudges.length);
      const remainingApps = apps.length % qualifiedJudges.length;

      let currentIndex = 0;
      qualifiedJudges.forEach((judgeData, index) => {
        const appsToAssign = appsPerJudge + (index < remainingApps ? 1 : 0);
        const assignedApps = apps.slice(currentIndex, currentIndex + appsToAssign);
        
        judgeData.assignedApplications.push(...assignedApps);
        judgeData.totalApplications += assignedApps.length;
        
        console.log(`   ${judgeData.judge.user_id.first_name}: ${assignedApps.length} ${sector} applications`);
        currentIndex += appsToAssign;
      });
    });

    // Step 4: Calculate target equal distribution
    const totalApplications = allApplications.length;
    const targetPerJudge = Math.floor(totalApplications / judges.length);
    const extraApplications = totalApplications % judges.length;

    console.log(`\n📊 TARGET DISTRIBUTION:`);
    console.log(`   Target per judge: ${targetPerJudge}`);
    console.log(`   Extra applications: ${extraApplications}\n`);

    // Step 5: Balance workload - move applications between judges if needed
    console.log('⚖️ STEP 2: Balancing workload...\n');
    
    // Sort judges by current workload
    const sortedJudges = Object.entries(judgeExpertise)
      .map(([judgeId, data]) => ({ judgeId, ...data }))
      .sort((a, b) => a.totalApplications - b.totalApplications);

    // Calculate how many applications each judge should have
    const targetDistribution = sortedJudges.map((judgeData, index) => ({
      ...judgeData,
      targetApplications: targetPerJudge + (index < extraApplications ? 1 : 0)
    }));

    // Show current vs target distribution
    console.log('📋 CURRENT vs TARGET DISTRIBUTION:');
    targetDistribution.forEach((judgeData, index) => {
      const difference = judgeData.totalApplications - judgeData.targetApplications;
      const status = difference === 0 ? '✅' : difference > 0 ? '📤' : '📥';
      console.log(`${status} ${judgeData.judge.user_id.first_name}: ${judgeData.totalApplications}/${judgeData.targetApplications} (${difference > 0 ? '+' : ''}${difference})`);
    });

    // Step 6: Handle overflow applications (applications assigned to judges without expertise)
    console.log('\n🔄 STEP 3: Handling overflow applications...\n');
    
    const overflowApplications = [];
    targetDistribution.forEach(judgeData => {
      if (judgeData.totalApplications > judgeData.targetApplications) {
        const excess = judgeData.totalApplications - judgeData.targetApplications;
        const appsToMove = judgeData.assignedApplications.splice(-excess);
        overflowApplications.push(...appsToMove);
        judgeData.totalApplications -= excess;
        console.log(`   Moved ${excess} applications from ${judgeData.judge.user_id.first_name} to overflow`);
      }
    });

    // Distribute overflow applications to judges with capacity
    if (overflowApplications.length > 0) {
      console.log(`\n📦 Distributing ${overflowApplications.length} overflow applications...`);
      
      const judgesWithCapacity = targetDistribution
        .filter(judgeData => judgeData.totalApplications < judgeData.targetApplications)
        .sort((a, b) => a.totalApplications - b.totalApplications);

      let overflowIndex = 0;
      judgesWithCapacity.forEach(judgeData => {
        const capacity = judgeData.targetApplications - judgeData.totalApplications;
        const appsToAssign = Math.min(capacity, overflowApplications.length - overflowIndex);
        
        if (appsToAssign > 0) {
          const assignedOverflow = overflowApplications.slice(overflowIndex, overflowIndex + appsToAssign);
          judgeData.assignedApplications.push(...assignedOverflow);
          judgeData.totalApplications += appsToAssign;
          overflowIndex += appsToAssign;
          
          console.log(`   Assigned ${appsToAssign} overflow applications to ${judgeData.judge.user_id.first_name}`);
        }
      });
    }

    // Step 7: Final distribution summary
    console.log('\n📊 FINAL DISTRIBUTION:');
    targetDistribution.forEach((judgeData, index) => {
      console.log(`\n👨‍⚖️ ${judgeData.judge.user_id.first_name} ${judgeData.judge.user_id.last_name}:`);
      console.log(`   Total applications: ${judgeData.totalApplications}`);
      console.log(`   Expertise sectors: ${judgeData.sectors.join(', ')}`);
      
      // Show sector breakdown
      const sectorBreakdown = {};
      judgeData.assignedApplications.forEach(app => {
        sectorBreakdown[app.sector] = (sectorBreakdown[app.sector] || 0) + 1;
      });
      
      console.log(`   Sector breakdown:`);
      Object.entries(sectorBreakdown).forEach(([sector, count]) => {
        const isExpertise = judgeData.sectors.includes(sector);
        console.log(`     ${sector}: ${count} applications ${isExpertise ? '✅' : '⚠️'}`);
      });
    });

    // Check Velixify assignment
    const velixifyApp = allApplications.find(app => 
      app.business_name.toLowerCase().includes('velixify')
    );

    if (velixifyApp) {
      console.log('\n🔍 VELIXIFY ASSIGNMENT:');
      const assignedJudge = targetDistribution.find(judgeData => 
        judgeData.assignedApplications.some(app => app._id.equals(velixifyApp._id))
      );
      
      if (assignedJudge) {
        const hasITExpertise = assignedJudge.sectors.includes('Information Technology (IT)');
        console.log(`   ✅ Assigned to: ${assignedJudge.judge.user_id.first_name} ${assignedJudge.judge.user_id.last_name}`);
        console.log(`   Expertise match: ${hasITExpertise ? '✅ YES' : '⚠️ NO (overflow assignment)'}`);
      } else {
        console.log(`   ❌ Not assigned to any judge`);
      }
    }

    // Calculate final fairness metrics
    const finalCounts = targetDistribution.map(d => d.totalApplications);
    const minCount = Math.min(...finalCounts);
    const maxCount = Math.max(...finalCounts);
    const difference = maxCount - minCount;

    console.log(`\n📈 FINAL FAIRNESS METRICS:`);
    console.log(`   Minimum applications: ${minCount}`);
    console.log(`   Maximum applications: ${maxCount}`);
    console.log(`   Difference: ${difference} applications`);
    console.log(`   Fairness: ${difference <= 1 ? '✅ EXCELLENT' : difference <= 2 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

implementHybridDistribution();
