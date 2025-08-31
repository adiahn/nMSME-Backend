const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:5000/api'; // Update this to your server URL

// Load super admin token
let superAdminToken;
try {
  const tokenData = JSON.parse(fs.readFileSync('super-admin-token.json', 'utf8'));
  superAdminToken = tokenData.token;
  console.log('✅ Loaded Super Admin token');
} catch (error) {
  console.log('❌ Failed to load Super Admin token. Please run create-super-admin.js first.');
  process.exit(1);
}

const judgeData = {
  first_name: "Adnan",
  last_name: "Mukhtar",
  email: "adnan.mukhtar@nmsme-awards.org",
  phone: "+2348012345682",
  password: "ad0701131nan",
  expertise_sectors: [
    "fashion",
    "it",
    "agribusiness",
    "food_beverage",
    "light_manufacturing",
    "creative_enterprise"
  ],
  professional_credentials: {
    title: "Business Consultant",
    institution: "Independent Practice",
    department: "Business Development",
    years_of_experience: 5,
    qualifications: [
      "Bachelor of Business Administration",
      "Certified Business Consultant"
    ],
    areas_of_expertise: [
      "Business Strategy",
      "Market Analysis",
      "Financial Planning",
      "Digital Transformation"
    ]
  },
  availability: {
    max_applications_per_round: 25,
    preferred_categories: [
      "fashion",
      "it",
      "agribusiness"
    ]
  }
};

async function createJudge() {
  try {
    console.log('🚀 Creating Judge User...');
    console.log('📧 Email:', judgeData.email);
    console.log('🔑 Password:', judgeData.password);
    
    const response = await axios.post(`${API_BASE_URL}/admin/judges/create`, judgeData, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Judge created successfully!');
      console.log('👤 User ID:', response.data.data.user._id);
      console.log('⚖️ Judge Profile ID:', response.data.data.judge_profile.id);
      console.log('📧 Email:', response.data.data.user.email);
      console.log('🔑 Password:', judgeData.password);
      
      // Save judge info to file
      const judgeInfo = {
        user_id: response.data.data.user._id,
        judge_profile_id: response.data.data.judge_profile.id,
        email: response.data.data.user.email,
        password: judgeData.password,
        created_at: new Date().toISOString()
      };
      
      fs.writeFileSync('judge-credentials.json', JSON.stringify(judgeInfo, null, 2));
      console.log('💾 Judge credentials saved to judge-credentials.json');
      
    } else {
      console.log('❌ Failed to create Judge:', response.data.error);
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ Server Error:', error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Run the script
createJudge();
