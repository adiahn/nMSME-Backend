const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testEndpoints() {
  try {
    console.log('🧪 Testing API Endpoints...\n');

    // Test 1: Check if server is running
    console.log('1️⃣ Testing server connection...');
    try {
      const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server connection failed:', error.message);
      return;
    }

    // Test 2: Test super admin creation endpoint
    console.log('\n2️⃣ Testing super admin creation endpoint...');
    try {
      const superAdminData = {
        first_name: "Test",
        last_name: "Admin",
        email: "testadmin@nmsme-awards.org",
        phone: "+2348012345680",
        password: "TestAdmin2024!",
        confirm_password: "TestAdmin2024!",
        security_key: "NMSME_SUPER_ADMIN_2024",
        admin_credentials: {
          title: "Test Administrator",
          institution: "Test Institution",
          department: "Test Department"
        }
      };

      const response = await axios.post(`${API_BASE_URL}/auth/create-super-admin`, superAdminData);
      console.log('✅ Super admin creation endpoint working');
      console.log('📧 Created user:', response.data.data.user.email);
    } catch (error) {
      if (error.response) {
        if (error.response.data.error === 'Super admin already exists. Only one super admin is allowed.') {
          console.log('✅ Super admin creation endpoint working (super admin already exists)');
        } else {
          console.log('❌ Super admin creation failed:', error.response.data.error);
        }
      } else {
        console.log('❌ Super admin creation failed:', error.message);
      }
    }

    // Test 3: Test login endpoint
    console.log('\n3️⃣ Testing login endpoint...');
    try {
      const loginData = {
        email_or_phone: "superadmin@nmsme-awards.org",
        password: "SuperAdmin2024!"
      };

      const response = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
      console.log('✅ Login endpoint working');
      console.log('🎫 Token received:', response.data.token ? 'Yes' : 'No');
      
      // Test 4: Test judge creation with the token
      if (response.data.token) {
        console.log('\n4️⃣ Testing judge creation with super admin token...');
        try {
          const judgeData = {
            first_name: "Test",
            last_name: "Judge",
            email: "testjudge@nmsme-awards.org",
            phone: "+2348012345681",
            password: "TestJudge2024!",
            expertise_sectors: ["fashion", "it"],
            professional_credentials: {
              title: "Test Consultant",
              institution: "Test Institution",
              department: "Test Department",
              years_of_experience: 3,
              qualifications: ["Test Qualification"],
              areas_of_expertise: ["Test Expertise"]
            },
            availability: {
              max_applications_per_round: 10,
              preferred_categories: ["fashion", "it"]
            }
          };

          const judgeResponse = await axios.post(`${API_BASE_URL}/admin/judges/create`, judgeData, {
            headers: {
              'Authorization': `Bearer ${response.data.token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ Judge creation working');
          console.log('👤 Created judge:', judgeResponse.data.data.user.email);
        } catch (judgeError) {
          if (judgeError.response) {
            console.log('❌ Judge creation failed:', judgeError.response.data.error);
          } else {
            console.log('❌ Judge creation failed:', judgeError.message);
          }
        }
      }
    } catch (error) {
      if (error.response) {
        console.log('❌ Login failed:', error.response.data.error);
      } else {
        console.log('❌ Login failed:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints();
