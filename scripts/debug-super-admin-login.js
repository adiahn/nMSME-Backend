require('dotenv').config({ path: './config.env' });
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function debugSuperAdminLogin() {
  try {
    console.log('🔍 DEBUGGING SUPER ADMIN LOGIN...\n');
    
    const loginData = {
      email: 'superadmin@kasedaaward.com',
      password: 'superAdmin123@@'
    };
    
    console.log('📧 Email:', loginData.email);
    console.log('🔑 Password:', loginData.password);
    console.log('🌐 API URL:', API_BASE_URL);
    
    console.log('\n📡 Making request to:', `${API_BASE_URL}/api/auth/admin/login`);
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/admin/login`, loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('\n✅ Response received:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.success) {
      console.log('Token (first 20 chars):', response.data.data.token.substring(0, 20) + '...');
      console.log('User ID:', response.data.data.user._id);
      console.log('Role:', response.data.data.user.role);
    }
    
  } catch (error) {
    console.log('\n❌ Error occurred:');
    console.log('Error type:', error.name);
    console.log('Error message:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    } else if (error.request) {
      console.log('No response received. Server might be down.');
      console.log('Request details:', error.request);
    } else {
      console.log('Request setup error:', error.message);
    }
  }
}

debugSuperAdminLogin();
