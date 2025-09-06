require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { User } = require('../models');

// Email configuration
const createGmailTransporter = (user, pass) => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });
};

// Get all configured email accounts
const getEmailAccounts = () => {
  const accounts = [];
  
  // Primary account
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    accounts.push({
      name: 'Primary',
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    });
  }
  
  // Backup accounts
  if (process.env.EMAIL_USER_2 && process.env.EMAIL_PASS_2) {
    accounts.push({
      name: 'Backup 1',
      user: process.env.EMAIL_USER_2,
      pass: process.env.EMAIL_PASS_2
    });
  }
  
  if (process.env.EMAIL_USER_3 && process.env.EMAIL_PASS_3) {
    accounts.push({
      name: 'Backup 2',
      user: process.env.EMAIL_USER_3,
      pass: process.env.EMAIL_PASS_3
    });
  }
  
  return accounts;
};

// Load email template
const loadEmailTemplate = () => {
  try {
    const templatePath = path.join(__dirname, '../templates/incomplete-registration-email.html');
    return fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error('Error loading email template:', error.message);
    return null;
  }
};

// Replace template variables
const replaceTemplateVariables = (template, userData) => {
  const applicationUrl = process.env.FRONTEND_URL || 'https://kasedaaward.com/apply';
  const deadlineDate = process.env.APPLICATION_DEADLINE || 'December 31, 2024';
  
  return template
    .replace(/{{USER_NAME}}/g, userData.name)
    .replace(/{{APPLICATION_URL}}/g, applicationUrl)
    .replace(/{{DEADLINE_DATE}}/g, deadlineDate);
};

// Send email to a single user
const sendEmailToUser = async (userData, emailAccounts) => {
  const template = loadEmailTemplate();
  if (!template) {
    throw new Error('Could not load email template');
  }
  
  const htmlContent = replaceTemplateVariables(template, userData);
  
  const mailOptions = {
    from: `"nMSME Awards Portal" <${process.env.EMAIL_FROM || 'noreply@kasedaaward.com'}>`,
    to: userData.email,
    subject: 'Complete Your nMSME Awards Application - We\'re Here to Help!',
    html: htmlContent
  };
  
  // Try each email account until one succeeds
  for (let i = 0; i < emailAccounts.length; i++) {
    const account = emailAccounts[i];
    try {
      console.log(`📧 Sending email to ${userData.name} (${userData.email}) using ${account.name}...`);
      const transporter = createGmailTransporter(account.user, account.pass);
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${userData.email} using ${account.name}`);
      return { success: true, account: account.name };
    } catch (error) {
      console.error(`❌ ${account.name} failed for ${userData.email}:`, error.message);
      if (i === emailAccounts.length - 1) {
        throw new Error(`All email accounts failed for ${userData.email}`);
      }
      console.log(`🔄 Trying next email account...`);
    }
  }
};

// Main function
async function sendIncompleteRegistrationEmails() {
  try {
    console.log('📧 SENDING INCOMPLETE REGISTRATION FOLLOW-UP EMAILS\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log('✅ Connected to database');
    
    // Load incomplete users data
    const incompleteUsersPath = path.join(__dirname, '../incomplete-users.json');
    if (!fs.existsSync(incompleteUsersPath)) {
      console.log('❌ incomplete-users.json not found. Please run identify-incomplete-users.js first.');
      return;
    }
    
    const incompleteUsers = JSON.parse(fs.readFileSync(incompleteUsersPath, 'utf8'));
    console.log(`📊 Found ${incompleteUsers.length} users to contact`);
    
    if (incompleteUsers.length === 0) {
      console.log('🎉 No incomplete users found!');
      return;
    }
    
    // Get email accounts
    const emailAccounts = getEmailAccounts();
    if (emailAccounts.length === 0) {
      console.log('❌ No email accounts configured');
      return;
    }
    
    console.log(`📧 Using ${emailAccounts.length} email account(s)`);
    
    // Send emails with rate limiting
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < incompleteUsers.length; i++) {
      const user = incompleteUsers[i];
      
      try {
        await sendEmailToUser(user, emailAccounts);
        results.successful++;
        
        // Rate limiting: wait 2 seconds between emails to avoid being flagged as spam
        if (i < incompleteUsers.length - 1) {
          console.log('⏳ Waiting 2 seconds before next email...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Failed to send email to ${user.email}:`, error.message);
        results.failed++;
        results.errors.push({
          email: user.email,
          name: user.name,
          error: error.message
        });
      }
    }
    
    // Summary
    console.log('\n📊 EMAIL CAMPAIGN SUMMARY:');
    console.log('=' .repeat(40));
    console.log(`Total users: ${incompleteUsers.length}`);
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success rate: ${(results.successful / incompleteUsers.length * 100).toFixed(1)}%`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ FAILED EMAILS:');
      results.errors.forEach(error => {
        console.log(`- ${error.name} (${error.email}): ${error.error}`);
      });
    }
    
    // Save results
    const resultsPath = path.join(__dirname, '../email-campaign-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      total_users: incompleteUsers.length,
      successful: results.successful,
      failed: results.failed,
      success_rate: (results.successful / incompleteUsers.length * 100).toFixed(1),
      errors: results.errors
    }, null, 2));
    
    console.log(`\n💾 Results saved to email-campaign-results.json`);
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

// Check if running directly
if (require.main === module) {
  sendIncompleteRegistrationEmails();
}

module.exports = { sendIncompleteRegistrationEmails };
