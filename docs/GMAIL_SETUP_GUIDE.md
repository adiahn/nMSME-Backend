# Gmail SMTP Setup Guide for nMSME Awards Portal

## Overview
This guide will help you set up Gmail SMTP for sending OTPs and other emails in the nMSME Awards Portal, replacing SendGrid.

## Prerequisites
- Gmail account (velixifyltd@gmail.com)
- 2-Factor Authentication enabled on Gmail account

## Step 1: Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Sign in with your Gmail account
3. Under "Signing in to Google", click **2-Step Verification**
4. Follow the setup process to enable 2FA

## Step 2: Generate App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **App passwords**
3. Select **Mail** as the app
4. Select **Other (custom name)** as the device
5. Enter "nMSME Awards Portal" as the name
6. Click **Generate**
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

## Step 3: Update Configuration

Update your `config.env` file with the Gmail App Password:

```env
# Gmail SMTP Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=velixifyltd@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=velixifyltd@gmail.com
```

**Important:** 
- Use the 16-character App Password, NOT your regular Gmail password
- Remove spaces from the App Password when entering it

## Step 4: Test Configuration

Run the test script to verify your Gmail configuration:

```bash
node test-gmail-config.js
```

Expected output:
```
✅ Gmail connection verified successfully!
✅ Test email sent successfully!
🎉 Gmail configuration is working correctly!
```

## Step 5: Restart Server

After updating the configuration, restart your server:

```bash
# Kill existing server
taskkill /F /IM node.exe

# Start server
npm run dev
```

## Email Functions Now Using Gmail

The following email functions have been updated to use Gmail SMTP:

- ✅ **OTP Emails** - `sendOTPEmail()`
- ✅ **Email Verification** - `sendEmailVerification()`
- ✅ **Password Reset** - `sendPasswordReset()`
- ✅ **Application Status** - `sendApplicationStatusNotification()`
- ✅ **Welcome Emails** - `sendWelcomeEmail()`

## Troubleshooting

### Error: "Invalid login"
- Make sure you're using the App Password, not your regular Gmail password
- Verify that 2FA is enabled on your Gmail account
- Check that the App Password was copied correctly (no spaces)

### Error: "Less secure app access"
- This error shouldn't occur with App Passwords
- If it does, make sure you're using the App Password correctly

### Error: "Connection timeout"
- Check your internet connection
- Verify the SMTP settings:
  - Host: `smtp.gmail.com`
  - Port: `587`
  - Security: `STARTTLS`

### Emails not being received
- Check spam/junk folder
- Verify the recipient email address
- Check Gmail's sending limits (500 emails/day for free accounts)

## Gmail Sending Limits

- **Free Gmail**: 500 emails per day
- **Google Workspace**: 2000 emails per day
- **Rate limit**: 100 emails per 100 seconds

## Security Notes

- Never commit App Passwords to version control
- Use environment variables for all sensitive data
- Regularly rotate App Passwords
- Monitor email sending activity

## Testing OTP Functionality

After setup, test the OTP functionality:

1. Try registering a new user
2. Check that OTP email is received
3. Verify the OTP code works for verification

## Support

If you encounter issues:

1. Run the test script: `node test-gmail-config.js`
2. Check server logs for error messages
3. Verify Gmail account settings
4. Ensure App Password is correctly configured

## Migration from SendGrid

The system has been updated to use Gmail for all email functions. SendGrid configuration is still present but no longer used for OTP emails.

**Benefits of Gmail SMTP:**
- ✅ No monthly limits (within Gmail limits)
- ✅ No credit exhaustion
- ✅ Reliable delivery
- ✅ Free to use
- ✅ Easy setup and maintenance
