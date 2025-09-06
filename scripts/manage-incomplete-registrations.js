require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const { User, Application } = require('../models');
const { sendIncompleteRegistrationEmails } = require('./send-incomplete-registration-emails');

async function manageIncompleteRegistrations() {
  try {
    console.log('🎯 INCOMPLETE REGISTRATION MANAGEMENT SYSTEM\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to database');
    
    // Step 1: Identify incomplete users
    console.log('\n📊 STEP 1: IDENTIFYING INCOMPLETE USERS');
    console.log('=' .repeat(50));
    
    const verifiedUsers = await User.find({
      is_verified: true,
      is_active: true,
      role: 'applicant'
    }).select('_id first_name last_name email phone created_at');
    
    const applications = await Application.find({}).select('user_id');
    const userIdsWithApplications = applications.map(app => app.user_id.toString());
    
    const incompleteUsers = verifiedUsers.filter(user => 
      !userIdsWithApplications.includes(user._id.toString())
    );
    
    console.log(`Total verified users: ${verifiedUsers.length}`);
    console.log(`Users with applications: ${verifiedUsers.length - incompleteUsers.length}`);
    console.log(`Users without applications: ${incompleteUsers.length}`);
    console.log(`Completion rate: ${((verifiedUsers.length - incompleteUsers.length) / verifiedUsers.length * 100).toFixed(1)}%`);
    
    if (incompleteUsers.length === 0) {
      console.log('\n🎉 No incomplete users found! All registered users have applied.');
      mongoose.connection.close();
      return;
    }
    
    // Step 2: Analyze incomplete users
    console.log('\n📈 STEP 2: ANALYZING INCOMPLETE USERS');
    console.log('=' .repeat(50));
    
    // Group by registration date
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recent = incompleteUsers.filter(user => user.created_at >= oneWeekAgo);
    const weekOld = incompleteUsers.filter(user => user.created_at >= twoWeeksAgo && user.created_at < oneWeekAgo);
    const monthOld = incompleteUsers.filter(user => user.created_at >= oneMonthAgo && user.created_at < twoWeeksAgo);
    const older = incompleteUsers.filter(user => user.created_at < oneMonthAgo);
    
    console.log(`Registered in last 7 days: ${recent.length}`);
    console.log(`Registered 1-2 weeks ago: ${weekOld.length}`);
    console.log(`Registered 2-4 weeks ago: ${monthOld.length}`);
    console.log(`Registered over 1 month ago: ${older.length}`);
    
    // Step 3: Show sample of incomplete users
    console.log('\n👥 STEP 3: SAMPLE OF INCOMPLETE USERS');
    console.log('=' .repeat(50));
    
    const sampleSize = Math.min(10, incompleteUsers.length);
    for (let i = 0; i < sampleSize; i++) {
      const user = incompleteUsers[i];
      const daysSinceRegistration = Math.floor((now - user.created_at) / (1000 * 60 * 60 * 24));
      console.log(`${i + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Registered: ${user.created_at.toISOString().split('T')[0]} (${daysSinceRegistration} days ago)`);
      console.log('');
    }
    
    if (incompleteUsers.length > sampleSize) {
      console.log(`... and ${incompleteUsers.length - sampleSize} more users`);
    }
    
    // Step 4: Ask for confirmation before sending emails
    console.log('\n📧 STEP 4: EMAIL CAMPAIGN OPTIONS');
    console.log('=' .repeat(50));
    console.log('Choose an option:');
    console.log('1. Send emails to ALL incomplete users');
    console.log('2. Send emails to users registered more than 1 week ago');
    console.log('3. Send emails to users registered more than 2 weeks ago');
    console.log('4. Send emails to users registered more than 1 month ago');
    console.log('5. Preview email template only');
    console.log('6. Exit without sending emails');
    
    // For now, we'll implement option 2 (users registered more than 1 week ago)
    // In a real implementation, you'd use readline or similar for user input
    const targetUsers = weekOld.concat(monthOld).concat(older);
    
    if (targetUsers.length === 0) {
      console.log('\n✅ No users meet the criteria for email campaign (registered more than 1 week ago)');
      mongoose.connection.close();
      return;
    }
    
    console.log(`\n📧 Ready to send emails to ${targetUsers.length} users (registered more than 1 week ago)`);
    console.log('This will help users who may have forgotten or encountered issues during application.');
    
    // Save target users for email campaign
    const fs = require('fs');
    const targetUsersData = targetUsers.map(user => ({
      id: user._id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: user.phone,
      registered_date: user.created_at.toISOString().split('T')[0]
    }));
    
    fs.writeFileSync('incomplete-users.json', JSON.stringify(targetUsersData, null, 2));
    console.log('💾 Saved target users to incomplete-users.json');
    
    // Step 5: Send emails
    console.log('\n📤 STEP 5: SENDING EMAILS');
    console.log('=' .repeat(50));
    
    await sendIncompleteRegistrationEmails();
    
    console.log('\n🎉 INCOMPLETE REGISTRATION MANAGEMENT COMPLETED!');
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  manageIncompleteRegistrations();
}

module.exports = { manageIncompleteRegistrations };
