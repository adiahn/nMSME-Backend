const axios = require('axios');

async function testAPIEndpoints() {
  try {
    console.log('🧪 TESTING API ENDPOINTS DIRECTLY\n');
    console.log('=' .repeat(60));
    
    // Test 1: Check if server is running
    console.log('🔍 Test 1: Server Health Check');
    try {
      const healthResponse = await axios.get('http://localhost:5000/health');
      console.log(`   ✅ Server is running - Status: ${healthResponse.status}`);
      console.log(`   Response: ${JSON.stringify(healthResponse.data)}`);
    } catch (error) {
      console.log(`   ❌ Server health check failed: ${error.message}`);
      return;
    }
    console.log('');

    // Test 2: Check public debug endpoint
    console.log('🔍 Test 2: Public Debug Endpoint');
    try {
      const debugResponse = await axios.get('http://localhost:5000/api/public/debug/applications');
      console.log(`   ✅ Debug endpoint working - Status: ${debugResponse.status}`);
      console.log(`   Applications found: ${debugResponse.data.count}`);
      console.log(`   Data: ${JSON.stringify(debugResponse.data, null, 2)}`);
    } catch (error) {
      console.log(`   ❌ Debug endpoint failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    console.log('');

    // Test 3: Check applications endpoint (without auth)
    console.log('🔍 Test 3: Applications Endpoint (No Auth)');
    try {
      const appsResponse = await axios.get('http://localhost:5000/api/applications');
      console.log(`   ✅ Applications endpoint working - Status: ${appsResponse.status}`);
      console.log(`   Data: ${JSON.stringify(appsResponse.data, null, 2)}`);
    } catch (error) {
      console.log(`   ❌ Applications endpoint failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    console.log('');

    // Test 4: Check if there are any other endpoints
    console.log('🔍 Test 4: Check for other possible endpoints');
    const possibleEndpoints = [
      '/api/applications/all',
      '/api/admin/applications',
      '/api/user/applications',
      '/api/dashboard/applications'
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        const response = await axios.get(`http://localhost:5000${endpoint}`);
        console.log(`   ✅ ${endpoint} - Status: ${response.status}`);
        if (response.data && response.data.count !== undefined) {
          console.log(`   Applications: ${response.data.count}`);
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log(`   🔒 ${endpoint} - Requires authentication`);
        } else if (error.response && error.response.status === 404) {
          console.log(`   ❌ ${endpoint} - Not found`);
        } else {
          console.log(`   ❌ ${endpoint} - Error: ${error.message}`);
        }
      }
    }

    console.log('\n✅ API testing complete');
    
  } catch (error) {
    console.error('❌ API testing error:', error.message);
  }
}

testAPIEndpoints();
