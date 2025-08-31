const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testJudgeLogin() {
  try {
    console.log('🧪 Testing Judge Login...\n');

    // Test Adnan Mukhtar login
    console.log('1️⃣ Testing Adnan Mukhtar login...');
    const loginData = {
      email_or_phone: "adnan.mukhtar@nmsme-awards.org",
      password: "ad0701131nan"
    };

    const response = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    
    if (response.data.success) {
      console.log('✅ Login successful!');
      console.log('👤 User:', response.data.user.first_name, response.data.user.last_name);
      console.log('🎭 Role:', response.data.user.role);
      console.log('🎫 Token received:', response.data.token ? 'Yes' : 'No');
      console.log('📧 Email:', response.data.user.email);
      console.log('📱 Phone:', response.data.user.phone);
    } else {
      console.log('❌ Login failed:', response.data.error);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ Login failed:', error.response.data.error);
    } else {
      console.log('❌ Login failed:', error.message);
    }
  }
}

testJudgeLogin();
