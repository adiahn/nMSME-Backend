const axios = require('axios');

async function testAPIEndpoints() {
  try {
    console.log('🌐 TESTING PUBLIC API ENDPOINTS\n');
    
    const baseURL = 'http://localhost:5000/api/public';
    
    // Test 1: Reviewed Applications
    console.log('📋 TEST 1: GET /api/public/reviewed-applications');
    try {
      const response1 = await axios.get(`${baseURL}/reviewed-applications`);
      console.log('   ✅ Status:', response1.status);
      console.log('   📊 Count:', response1.data.count);
      console.log('   📝 Applications:');
      response1.data.applications.forEach((app, index) => {
        console.log(`     ${index + 1}. ${app.business_name} (${app.workflow_stage})`);
        console.log(`        Average Score: ${app.scoring.average_score}/100`);
        console.log(`        Total Scores: ${app.scoring.total_scores}`);
      });
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data || error.message);
    }

    console.log('\n📈 TEST 2: GET /api/public/reviewed-applications/summary');
    try {
      const response2 = await axios.get(`${baseURL}/reviewed-applications/summary`);
      console.log('   ✅ Status:', response2.status);
      console.log('   📊 Summary:');
      console.log(`     Total Reviewed: ${response2.data.summary.total_reviewed_applications}`);
      console.log(`     Stage Distribution:`, response2.data.summary.stage_distribution);
      console.log(`     Scoring Stats:`, response2.data.summary.scoring_statistics);
      console.log(`     Grade Distribution:`, response2.data.summary.grade_distribution);
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data || error.message);
    }

    console.log('\n🔍 TEST 3: GET /api/public/check-application-status?business_name=Communication');
    try {
      const response3 = await axios.get(`${baseURL}/check-application-status?business_name=Communication`);
      console.log('   ✅ Status:', response3.status);
      console.log('   📝 Result:');
      console.log(`     Found: ${response3.data.found}`);
      console.log(`     Count: ${response3.data.count}`);
      if (response3.data.applications) {
        response3.data.applications.forEach((app, index) => {
          console.log(`     ${index + 1}. ${app.business_name} (${app.workflow_stage})`);
        });
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data || error.message);
    }

    console.log('\n✅ API ENDPOINTS TEST COMPLETED!');
    console.log('\n🌐 AVAILABLE PUBLIC ENDPOINTS:');
    console.log('   GET /api/public/reviewed-applications');
    console.log('   GET /api/public/reviewed-applications/summary');
    console.log('   GET /api/public/check-application-status?business_name=NAME');
    console.log('   GET /api/public/check-application-status?email=EMAIL');
    console.log('   GET /api/public/debug/applications');
    console.log('   GET /api/public/debug/users');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPIEndpoints();
