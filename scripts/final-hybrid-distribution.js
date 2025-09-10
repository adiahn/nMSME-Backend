const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function implementFinalHybridDistribution() {
  try {
    console.log('🎯 FINAL HYBRID DISTRIBUTION SYSTEM\n');
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

    // Initialize judge data
    const judgeData = judges.map(judge => ({
      judge: judge,
      sectors: judge.expertise_sectors.map(sector => expertiseToSectorMap[sector]).filter(Boolean),
      assignedApplications: [],
      totalApplications: 0
    }));

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

    // Step 2: First pass - assign applications to judges with matching expertise
    console.log('🎯 STEP 1: Assigning applications to matching expertise judges...\n');
    
    Object.entries(applicationsBySector).forEach(([sector, apps]) => {
      // Find judges with this sector expertise
      const qualifiedJudges = judgeData.filter(judge => judge.sectors.includes(sector));

      if (qualifiedJudges.length === 0) {
        console.log(`⚠️  No judges found for sector: ${sector}`);
        return;
      }

      // Distribute applications among qualified judges
      const appsPerJudge = Math.floor(apps.length / qualifiedJudges.length);
      const remainingApps = apps.length % qualifiedJudges.length;

      let currentIndex = 0;
      qualifiedJudges.forEach((judge, index) => {
        const appsToAssign = appsPerJudge + (index < remainingApps ? 1 : 0);
        const assignedApps = apps.slice(currentIndex, currentIndex + appsToAssign);
        
        judge.assignedApplications.push(...assignedApps);
        judge.totalApplications += assignedApps.length;
        
        console.log(`   ${judge.judge.user_id.first_name}: ${assignedApps.length} ${sector} applications`);
        currentIndex += appsToAssign;
      });
    });

    // Step 3: Calculate target equal distribution
    const totalApplications = allApplications.length;
    const targetPerJudge = Math.floor(totalApplications / judges.length);
    const extraApplications = totalApplications % judges.length;

    console.log(`\n📊 TARGET DISTRIBUTION:`);
    console.log(`   Target per judge: ${targetPerJudge}`);
    console.log(`   Extra applications: ${extraApplications}\n`);

    // Step 4: Show current distribution
    console.log('📋 CURRENT DISTRIBUTION:');
    judgeData.forEach((judge, index) => {
      const target = targetPerJudge + (index < extraApplications ? 1 : 0);
      const difference = judge.totalApplications - target;
      const status = difference === 0 ? '✅' : difference > 0 ? '📤' : '📥';
      console.log(`${status} ${judge.judge.user_id.first_name}: ${judge.totalApplications}/${target} (${difference > 0 ? '+' : ''}${difference})`);
    });

    // Step 5: Balance workload
    console.log('\n⚖️ STEP 2: Balancing workload...\n');
    
    // Sort judges by current workload (ascending)
    const sortedJudges = [...judgeData].sort((a, b) => a.totalApplications - b.totalApplications);
    
    // Calculate target for each judge
    const targetDistribution = sortedJudges.map((judge, index) => ({
      ...judge,
      targetApplications: targetPerJudge + (index < extraApplications ? 1 : 0)
    }));

    // Find judges with excess applications
    const excessJudges = targetDistribution.filter(judge => judge.totalApplications > judge.targetApplications);
    const deficitJudges = targetDistribution.filter(judge => judge.totalApplications < judge.targetApplications);

    console.log(`📤 Judges with excess: ${excessJudges.length}`);
    console.log(`📥 Judges with deficit: ${deficitJudges.length}`);

    // Move applications from excess judges to deficit judges
    let movedApplications = 0;
    
    excessJudges.forEach(excessJudge => {
      const excess = excessJudge.totalApplications - excessJudge.targetApplications;
      if (excess <= 0) return;

      console.log(`\n   Moving ${excess} applications from ${excessJudge.judge.user_id.first_name}...`);
      
      // Find deficit judges who can take applications
      const availableDeficitJudges = deficitJudges.filter(judge => 
        judge.totalApplications < judge.targetApplications
      );

      if (availableDeficitJudges.length === 0) {
        console.log(`   No available judges to receive applications`);
        return;
      }

      // Move applications to deficit judges
      let remainingToMove = excess;
      const appsToMove = excessJudge.assignedApplications.splice(-excess);
      
      availableDeficitJudges.forEach(deficitJudge => {
        if (remainingToMove <= 0) return;
        
        const capacity = deficitJudge.targetApplications - deficitJudge.totalApplications;
        const appsToAssign = Math.min(capacity, remainingToMove);
        
        if (appsToAssign > 0) {
          const assignedApps = appsToMove.splice(0, appsToAssign);
          deficitJudge.assignedApplications.push(...assignedApps);
          deficitJudge.totalApplications += appsToAssign;
          remainingToMove -= appsToAssign;
          movedApplications += appsToAssign;
          
          console.log(`     → Moved ${appsToAssign} to ${deficitJudge.judge.user_id.first_name}`);
        }
      });

      // Update excess judge's total
      excessJudge.totalApplications -= (excess - remainingToMove);
    });

    console.log(`\n📦 Total applications moved: ${movedApplications}`);

    // Step 6: Final distribution summary
    console.log('\n📊 FINAL DISTRIBUTION:');
    targetDistribution.forEach((judge, index) => {
      console.log(`\n👨‍⚖️ ${judge.judge.user_id.first_name} ${judge.judge.user_id.last_name}:`);
      console.log(`   Total applications: ${judge.totalApplications}`);
      console.log(`   Target: ${judge.targetApplications}`);
      console.log(`   Difference: ${judge.totalApplications - judge.targetApplications}`);
      console.log(`   Expertise sectors: ${judge.sectors.join(', ')}`);
      
      // Show sector breakdown
      const sectorBreakdown = {};
      judge.assignedApplications.forEach(app => {
        sectorBreakdown[app.sector] = (sectorBreakdown[app.sector] || 0) + 1;
      });
      
      console.log(`   Sector breakdown:`);
      Object.entries(sectorBreakdown).forEach(([sector, count]) => {
        const isExpertise = judge.sectors.includes(sector);
        console.log(`     ${sector}: ${count} applications ${isExpertise ? '✅' : '⚠️'}`);
      });
    });

    // Check Velixify assignment
    const velixifyApp = allApplications.find(app => 
      app.business_name.toLowerCase().includes('velixify')
    );

    if (velixifyApp) {
      console.log('\n🔍 VELIXIFY ASSIGNMENT:');
      const assignedJudge = targetDistribution.find(judge => 
        judge.assignedApplications.some(app => app._id.equals(velixifyApp._id))
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

    // Show expertise coverage
    console.log(`\n🎯 EXPERTISE COVERAGE:`);
    Object.entries(applicationsBySector).forEach(([sector, apps]) => {
      const qualifiedJudges = targetDistribution.filter(judge => judge.sectors.includes(sector));
      const totalAssigned = qualifiedJudges.reduce((sum, judge) => {
        const sectorApps = judge.assignedApplications.filter(app => app.sector === sector);
        return sum + sectorApps.length;
      }, 0);
      
      console.log(`${sector}: ${totalAssigned}/${apps.length} applications assigned to qualified judges`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

implementFinalHybridDistribution();
