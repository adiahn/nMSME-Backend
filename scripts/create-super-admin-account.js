require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Admin } = require('../models');

async function createSuperAdmin() {
  try {
    console.log('🚀 Creating Super Admin Account...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to database');
    
    const password = 'superAdmin123@@';
    
    const superAdminData = {
      first_name: 'Super',
      last_name: 'Administrator',
      email: 'superadmin@kasedaaward.com',
      phone: '+2348012345678', // Default phone number
      password_hash: password, // Will be hashed by pre-save middleware
      role: 'super_admin',
      is_verified: true,
      is_active: true,
      registration_step: 3,
      admin_credentials: {
        title: 'Super Administrator',
        institution: 'nMSME Awards Portal',
        department: 'System Administration',
        years_of_experience: 10,
        qualifications: ['System Administration', 'Database Management'],
        areas_of_expertise: ['System Administration', 'User Management', 'Security']
      }
    };
    
    console.log('📧 Email:', superAdminData.email);
    console.log('🔑 Password:', password);
    console.log('👤 Role:', superAdminData.role);
    
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ 
      email: superAdminData.email 
    });
    
    let superAdmin;
    
    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists with this email');
      console.log('🔄 Updating existing account...');
      
      // Update existing account
      existingSuperAdmin.first_name = superAdminData.first_name;
      existingSuperAdmin.last_name = superAdminData.last_name;
      existingSuperAdmin.phone = superAdminData.phone;
      existingSuperAdmin.password_hash = password;
      existingSuperAdmin.role = superAdminData.role;
      existingSuperAdmin.is_verified = superAdminData.is_verified;
      existingSuperAdmin.is_active = superAdminData.is_active;
      existingSuperAdmin.registration_step = superAdminData.registration_step;
      existingSuperAdmin.admin_credentials = superAdminData.admin_credentials;
      
      await existingSuperAdmin.save();
      superAdmin = existingSuperAdmin;
      
      // Create or update admin profile
      let adminProfile = await Admin.findOne({ user_id: superAdmin._id });
      if (adminProfile) {
        adminProfile.title = superAdminData.admin_credentials.title;
        adminProfile.institution = superAdminData.admin_credentials.institution;
        adminProfile.department = superAdminData.admin_credentials.department;
        adminProfile.admin_type = 'super_admin';
        adminProfile.access_level = 'super_admin';
        adminProfile.permissions = ['full_system_access'];
        adminProfile.is_active = true;
        await adminProfile.save();
        console.log('🔄 Admin profile updated');
      } else {
        adminProfile = await Admin.create({
          user_id: superAdmin._id,
          admin_type: 'super_admin',
          title: superAdminData.admin_credentials.title,
          institution: superAdminData.admin_credentials.institution,
          department: superAdminData.admin_credentials.department,
          access_level: 'super_admin',
          permissions: ['full_system_access'],
          is_active: true,
          created_by: superAdmin._id
        });
        console.log('✅ Admin profile created');
      }
      
      console.log('✅ Super admin account updated successfully!');
      console.log('👤 User ID:', superAdmin._id);
      console.log('📧 Email:', superAdmin.email);
      console.log('🔑 Password:', password);
      console.log('⚖️ Admin Profile ID:', adminProfile._id);
      
    } else {
      // Create new super admin
      superAdmin = new User(superAdminData);
      await superAdmin.save();
      
      // Create admin profile
      const adminProfile = await Admin.create({
        user_id: superAdmin._id,
        admin_type: 'super_admin',
        title: superAdminData.admin_credentials.title,
        institution: superAdminData.admin_credentials.institution,
        department: superAdminData.admin_credentials.department,
        access_level: 'super_admin',
        permissions: ['full_system_access'],
        is_active: true,
        created_by: superAdmin._id
      });
      
      console.log('✅ Super admin account created successfully!');
      console.log('👤 User ID:', superAdmin._id);
      console.log('📧 Email:', superAdmin.email);
      console.log('🔑 Password:', password);
      console.log('⚖️ Admin Profile ID:', adminProfile._id);
    }
    
    // Save credentials to file
    const fs = require('fs');
    const credentials = {
      user_id: superAdmin._id,
      email: superAdminData.email,
      password: password,
      role: superAdminData.role,
      created_at: new Date().toISOString()
    };
    
    fs.writeFileSync('super-admin-credentials.json', JSON.stringify(credentials, null, 2));
    console.log('💾 Credentials saved to super-admin-credentials.json');
    
    // Test login
    console.log('\n🧪 Testing login...');
    try {
      const testUser = await User.findByEmailOrPhone(superAdminData.email);
      if (testUser && await testUser.comparePassword(password)) {
        console.log('✅ Login test successful!');
        console.log('🎯 Super admin is ready to use');
      } else {
        console.log('❌ Login test failed');
      }
    } catch (loginError) {
      console.log('❌ Login test error:', loginError.message);
    }
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

// Run the script
createSuperAdmin();






