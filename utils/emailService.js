const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Create SendGrid transporter for OTP emails
const createSendGridTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SENDGRID_HOST,
    port: process.env.SENDGRID_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SENDGRID_USERNAME,
      pass: process.env.SENDGRID_PASSWORD
    }
  });
};

// Create legacy transporter for other emails
const createLegacyTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Create multiple Gmail transporters for fallback
const createGmailTransporter = (user, pass) => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: user,
      pass: pass
    }
  });
};

// Get all available email accounts
const getEmailAccounts = () => {
  const accounts = [];
  
  // Primary account
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    accounts.push({
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      name: 'Primary Gmail'
    });
  }
  
  // Backup account 1
  if (process.env.EMAIL_USER_2 && process.env.EMAIL_PASS_2) {
    accounts.push({
      user: process.env.EMAIL_USER_2,
      pass: process.env.EMAIL_PASS_2,
      name: 'Backup Gmail 1'
    });
  }
  
  // Backup account 2
  if (process.env.EMAIL_USER_3 && process.env.EMAIL_PASS_3) {
    accounts.push({
      user: process.env.EMAIL_USER_3,
      pass: process.env.EMAIL_PASS_3,
      name: 'Backup Gmail 2'
    });
  }
  
  return accounts;
};

// Generate email verification token
const generateEmailVerificationToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'email_verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Generate password reset token
const generatePasswordResetToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Send OTP email using Gmail SMTP with fallback
const sendOTPEmail = async (user, otpCode) => {
  const emailAccounts = getEmailAccounts();
  
  if (emailAccounts.length === 0) {
    console.error('No email accounts configured');
    return false;
  }
  
  const mailOptions = {
    from: `"nMSME Awards Portal" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Your OTP Code - nMSME Awards Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Your OTP Code</h2>
        <p>Hello ${user.first_name},</p>
        <p>Your One-Time Password (OTP) for the nMSME Awards Portal registration is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color:rgb(52, 219, 102); color: white; padding: 20px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
            ${otpCode}
          </div>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
        <p style="color: #7f8c8d; font-size: 12px;">
          This is an automated email from the nMSME Awards Portal. Please do not reply to this email.
        </p>
      </div>
    `
  };

  // Try each email account until one succeeds
  for (let i = 0; i < emailAccounts.length; i++) {
    const account = emailAccounts[i];
    console.log(`📧 Trying ${account.name} (${account.user})...`);
    
    try {
      const transporter = createGmailTransporter(account.user, account.pass);
      await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${user.email} using ${account.name}`);
      return true;
    } catch (error) {
      console.error(`❌ ${account.name} failed:`, error.message);
      
      // If this is the last account, return false
      if (i === emailAccounts.length - 1) {
        console.error('All email accounts failed');
        return false;
      }
      
      // Continue to next account
      console.log(`🔄 Trying next email account...`);
    }
  }
  
  return false;
};

// Send email verification
const sendEmailVerification = async (user, token) => {
  const transporter = createLegacyTransporter();
  
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: `"nMSME Awards Portal" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Verify Your Email - nMSME Awards Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to nMSME Awards Portal!</h2>
        <p>Hello ${user.first_name},</p>
        <p>Thank you for registering with the nMSME Awards Portal. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #7f8c8d;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
        <p style="color: #7f8c8d; font-size: 12px;">
          This is an automated email from the nMSME Awards Portal. Please do not reply to this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email verification error:', error);
    return false;
  }
};

// Send password reset email
const sendPasswordReset = async (user, token) => {
  const transporter = createLegacyTransporter();
  
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: `"nMSME Awards Portal" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Reset Your Password - nMSME Awards Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>Hello ${user.first_name},</p>
        <p>You requested a password reset for your nMSME Awards Portal account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #7f8c8d;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
        <p style="color: #7f8c8d; font-size: 12px;">
          This is an automated email from the nMSME Awards Portal. Please do not reply to this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Password reset email error:', error);
    return false;
  }
};

// Send application status notification
const sendApplicationStatusNotification = async (user, application, status) => {
  const transporter = createLegacyTransporter();
  
  const statusMessages = {
    submitted: 'Your application has been submitted successfully and is now under review.',
    under_review: 'Your application is currently being reviewed by our judges.',
    shortlisted: 'Congratulations! Your application has been shortlisted for the final round.',
    approved: 'Congratulations! Your application has been approved.',
    rejected: 'We regret to inform you that your application was not approved.'
  };
  
  const mailOptions = {
    from: `"nMSME Awards Portal" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: `Application Status Update - ${status.toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Application Status Update</h2>
        <p>Hello ${user.first_name},</p>
        <p>Your application for the <strong>${application.category}</strong> category has been updated.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Status: ${status.toUpperCase()}</h3>
          <p>${statusMessages[status]}</p>
        </div>
        <p>You can log into your account to view more details about your application.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
        <p style="color: #7f8c8d; font-size: 12px;">
          This is an automated email from the nMSME Awards Portal. Please do not reply to this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Application status notification error:', error);
    return false;
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const transporter = createLegacyTransporter();
  
  const mailOptions = {
    from: `"nMSME Awards Portal" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Welcome to nMSME Awards Portal!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to nMSME Awards Portal!</h2>
        <p>Hello ${user.first_name},</p>
        <p>Welcome to the nMSME Awards Portal! Your account has been successfully created and verified.</p>
        <p>You can now:</p>
        <ul>
          <li>Complete your business profile</li>
          <li>Submit applications for awards</li>
          <li>Track your application status</li>
          <li>View results when announced</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
        <p style="color: #7f8c8d; font-size: 12px;">
          This is an automated email from the nMSME Awards Portal. Please do not reply to this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendApplicationStatusNotification,
  sendWelcomeEmail,
  generateEmailVerificationToken,
  generatePasswordResetToken
};
