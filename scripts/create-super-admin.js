const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api'; // Update this to your server URL

const superAdminData = {
  first_name: "System",
  last_name: "Administrator",
  email: "superadmin@nmsme-awards.org",
  phone: "+2348012345678",
  password: "SuperAdmin2024!",
  confirm_password: "SuperAdmin2024!",
  security_key: "NMSME_SUPER_ADMIN_2024",
  admin_credentials: {
    title: "System Administrator",
    institution: "nMSME Awards Portal",
    department: "System Administration"
  }
};

async function createSuperAdmin() {
  try {
    console.log('🚀 Creating Super Admin...');
    console.log('📧 Email:', superAdminData.email);
    console.log('🔑 Password:', superAdminData.password);
    
    const response = await axios.post(`${API_BASE_URL}/auth/create-super-admin`, superAdminData);
    
    if (response.data.success) {
      console.log('✅ Super Admin created successfully!');
      console.log('🎫 JWT Token:', response.data.data.token);
      console.log('👤 User ID:', response.data.data.user._id);
      console.log('🔐 Admin Profile ID:', response.data.data.admin_profile.id);
      
      // Save token to file for easy access
      const fs = require('fs');
      const tokenData = {
        token: response.data.data.token,
        user_id: response.data.data.user._id,
        admin_profile_id: response.data.data.admin_profile.id,
        created_at: new Date().toISOString()
      };
      
      fs.writeFileSync('super-admin-token.json', JSON.stringify(tokenData, null, 2));
      console.log('💾 Token saved to super-admin-token.json');
      
    } else {
      console.log('❌ Failed to create Super Admin:', response.data.error);
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
createSuperAdmin();
