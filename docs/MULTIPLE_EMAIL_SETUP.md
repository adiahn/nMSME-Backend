# Multiple Email Accounts Setup Guide

This guide explains how to set up multiple Gmail accounts for automatic fallback when sending OTP emails.

## 🎯 **Why Multiple Email Accounts?**

- **Gmail Daily Limits**: Each Gmail account has a 500 emails/day limit
- **Automatic Fallback**: If one account fails, the system tries the next one
- **High Availability**: Ensures OTP emails are always sent
- **Load Distribution**: Spreads email sending across multiple accounts

## 📧 **Setup Process**

### **Step 1: Create Additional Gmail Accounts**

1. **Create 2-3 Gmail accounts** (you already have the first one)
2. **Use different names** like:
   - `nmsme.awards.1@gmail.com`
   - `nmsme.awards.2@gmail.com`
   - `nmsme.awards.3@gmail.com`

### **Step 2: Enable 2FA on Each Account**

For each Gmail account:
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Generate an **App Password**:
   - Go to **App passwords**
   - Select **Mail** and **Other (Custom name)**
   - Enter "nMSME Backend"
   - Copy the generated password

### **Step 3: Update Environment Variables**

Edit your `config.env` file:

```env
# Primary Email Account (already configured)
EMAIL_USER=velixifyltd@gmail.com
EMAIL_PASS=dczvznkqwavtzmqc

# Backup Email Account 1
EMAIL_USER_2=nmsme.awards.1@gmail.com
EMAIL_PASS_2=your-app-password-here

# Backup Email Account 2
EMAIL_USER_3=nmsme.awards.2@gmail.com
EMAIL_PASS_3=your-app-password-here
```

### **Step 4: Test the System**

Run the test script:
```bash
node test-email-fallback.js
```

## 🔄 **How It Works**

1. **Primary Account**: System tries `EMAIL_USER` first
2. **Fallback 1**: If primary fails, tries `EMAIL_USER_2`
3. **Fallback 2**: If backup 1 fails, tries `EMAIL_USER_3`
4. **Success**: Returns `true` when any account succeeds
5. **Failure**: Returns `false` only if all accounts fail

## 📊 **Expected Output**

```
📧 Trying Primary Gmail (velixifyltd@gmail.com)...
❌ Primary Gmail failed: Daily user sending limit exceeded
🔄 Trying next email account...
📧 Trying Backup Gmail 1 (nmsme.awards.1@gmail.com)...
✅ OTP email sent successfully using Backup Gmail 1
```

## 🛠️ **Configuration Options**

### **Minimum Setup (2 accounts)**
```env
EMAIL_USER=primary@gmail.com
EMAIL_PASS=primary-password
EMAIL_USER_2=backup@gmail.com
EMAIL_PASS_2=backup-password
```

### **Full Setup (3 accounts)**
```env
EMAIL_USER=primary@gmail.com
EMAIL_PASS=primary-password
EMAIL_USER_2=backup1@gmail.com
EMAIL_PASS_2=backup1-password
EMAIL_USER_3=backup2@gmail.com
EMAIL_PASS_3=backup2-password
```

## 🚨 **Important Notes**

1. **App Passwords**: Use App Passwords, not regular passwords
2. **2FA Required**: All accounts must have 2FA enabled
3. **Same Domain**: All accounts should be Gmail for consistency
4. **Testing**: Test each account individually before using
5. **Monitoring**: Check logs to see which account is being used

## 🔧 **Troubleshooting**

### **"No email accounts configured"**
- Check that at least `EMAIL_USER` and `EMAIL_PASS` are set

### **"All email accounts failed"**
- Verify all App Passwords are correct
- Check if all accounts have 2FA enabled
- Ensure accounts haven't hit daily limits

### **"Daily user sending limit exceeded"**
- Wait 24 hours for limit to reset
- Use a different account temporarily
- Consider upgrading to Google Workspace (2000 emails/day)

## 📈 **Benefits**

- **99.9% Uptime**: Multiple fallbacks ensure emails are sent
- **Load Distribution**: Spreads sending across accounts
- **Automatic Recovery**: No manual intervention needed
- **Scalability**: Easy to add more accounts if needed

## 🎉 **Success Indicators**

- ✅ OTP emails are sent consistently
- ✅ System automatically switches between accounts
- ✅ No manual intervention required
- ✅ Users receive OTPs without delays
