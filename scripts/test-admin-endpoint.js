const axios = require('axios');

async function testAdminEndpoint() {
  try {
    console.log('🧪 TESTING ADMIN ENDPOINT\n');
    
    // Test the admin applications endpoint
    const response = await axios.get('http://localhost:5000/api/admin/applications/all', {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // You'll need to replace this
      }
    });
    
    console.log('✅ Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing admin endpoint:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

// Check if server is running first
async function checkServer() {
  try {
    console.log('🔍 Checking if server is running...');
    const response = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running');
    console.log('Health check response:', response.data);
    
    // Now test the admin endpoint
    await testAdminEndpoint();
    
  } catch (error) {
    console.error('❌ Server is not running or health check failed:');
    console.error('Message:', error.message);
    console.log('\n💡 Please start the server with: npm run dev');
  }
}

checkServer();
