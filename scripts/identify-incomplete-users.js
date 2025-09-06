require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const { User, Application } = require('../models');

async function identifyIncompleteUsers() {
  try {
    console.log('🔍 IDENTIFYING USERS WHO REGISTERED BUT NEVER APPLIED\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to database');
    
    // Find all users who are verified and active (completed registration)
    const verifiedUsers = await User.find({
      is_verified: true,
      is_active: true,
      role: 'applicant'
    }).select('_id first_name last_name email phone created_at');
    
    console.log(`📊 Found ${verifiedUsers.length} verified users`);
    
    // Find all applications
    const applications = await Application.find({}).select('user_id');
    const userIdsWithApplications = applications.map(app => app.user_id.toString());
    
    console.log(`📊 Found ${applications.length} applications`);
    
    // Find users who registered but never applied
    const incompleteUsers = verifiedUsers.filter(user => 
      !userIdsWithApplications.includes(user._id.toString())
    );
    
    console.log(`\n🎯 USERS WHO REGISTERED BUT NEVER APPLIED: ${incompleteUsers.length}`);
    console.log('=' .repeat(60));
    
    incompleteUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Registered: ${user.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    // Save to file for email campaign
    const fs = require('fs');
    const incompleteUsersData = incompleteUsers.map(user => ({
      id: user._id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: user.phone,
      registered_date: user.created_at.toISOString().split('T')[0]
    }));
    
    fs.writeFileSync('incomplete-users.json', JSON.stringify(incompleteUsersData, null, 2));
    console.log('💾 Saved incomplete users data to incomplete-users.json');
    
    // Statistics
    console.log('\n📈 STATISTICS:');
    console.log(`Total verified users: ${verifiedUsers.length}`);
    console.log(`Users with applications: ${verifiedUsers.length - incompleteUsers.length}`);
    console.log(`Users without applications: ${incompleteUsers.length}`);
    console.log(`Completion rate: ${((verifiedUsers.length - incompleteUsers.length) / verifiedUsers.length * 100).toFixed(1)}%`);
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

identifyIncompleteUsers();
