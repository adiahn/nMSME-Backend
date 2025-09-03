const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function checkUsers() {
  try {
    console.log('🔍 Checking existing users...\n');

    // First, login as super admin
    console.log('1️⃣ Logging in as super admin...');
    const loginData = {
      email_or_phone: "superadmin@nmsme-awards.org",
      password: "SuperAdmin2024!"
    };

    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Check admin dashboard for user statistics
    console.log('\n2️⃣ Checking admin dashboard...');
    try {
      const dashboardResponse = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Dashboard Data:');
      console.log('   Total Users:', dashboardResponse.data.data.overview.total_users);
      console.log('   Total Applications:', dashboardResponse.data.data.overview.total_applications);
      console.log('   Total Judges:', dashboardResponse.data.data.overview.total_judges);
      
    } catch (error) {
      console.log('❌ Dashboard access failed:', error.response?.data?.error || error.message);
    }

    // Check judges list
    console.log('\n3️⃣ Checking judges list...');
    try {
      const judgesResponse = await axios.get(`${API_BASE_URL}/admin/judges`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('⚖️ Judges:');
      judgesResponse.data.data.judges.forEach((judge, index) => {
        console.log(`   ${index + 1}. ${judge.user.first_name} ${judge.user.last_name} (${judge.user.email})`);
      });
      
    } catch (error) {
      console.log('❌ Judges list access failed:', error.response?.data?.error || error.message);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkUsers();
