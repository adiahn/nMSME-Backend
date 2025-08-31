# 🚀 **SUPER ADMIN SYSTEM SETUP GUIDE**

## 📋 **Overview**

This guide will help you set up the complete super admin system for the nMSME Awards Portal, including creating the first super admin and then using it to create judge users.

## 🛠️ **What Was Implemented**

### **1. New Models**
- ✅ **Admin Model** (`models/Admin.js`) - Stores admin-specific profile information
- ✅ **Updated User Model** - Added `super_admin` role support

### **2. New Middleware**
- ✅ **Super Admin Middleware** (`middleware/superAdmin.js`) - Authorization for super admin and admin users

### **3. New Routes**
- ✅ **Super Admin Creation** (`POST /api/auth/create-super-admin`) - One-time setup endpoint
- ✅ **Judge Creation** (`POST /api/admin/judges/create`) - Super admin only endpoint

### **4. Security Features**
- ✅ **Security Key Protection** - Only authorized users can create super admin
- ✅ **Role-Based Access Control** - Different permission levels for admin vs super admin
- ✅ **JWT Authentication** - Secure token-based authentication

## 🔐 **Setup Process**

### **Step 1: Environment Configuration**

Add this to your `.env` file:
```bash
SUPER_ADMIN_SECURITY_KEY=NMSME_SUPER_ADMIN_2024
```

### **Step 2: Create Super Admin**

Run the super admin creation script:
```bash
node create-super-admin.js
```

**Expected Output:**
```
🚀 Creating Super Admin...
📧 Email: superadmin@nmsme-awards.org
🔑 Password: SuperAdmin2024!
✅ Super Admin created successfully!
🎫 JWT Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
👤 User ID: 507f1f77bcf86cd799439011
🔐 Admin Profile ID: 507f1f77bcf86cd799439012
💾 Token saved to super-admin-token.json
```

### **Step 3: Create Judge User**

Run the judge creation script:
```bash
node create-judge.js
```

**Expected Output:**
```
✅ Loaded Super Admin token
🚀 Creating Judge User...
📧 Email: adnanmukhtar2321@gmail.com
🔑 Password: ad0701131nan
✅ Judge created successfully!
👤 User ID: 507f1f77bcf86cd799439013
⚖️ Judge Profile ID: 507f1f77bcf86cd799439014
📧 Email: adnanmukhtar2321@gmail.com
🔑 Password: ad0701131nan
💾 Judge credentials saved to judge-credentials.json
```

## 🔑 **API Endpoints**

### **1. Create Super Admin**
```http
POST /api/auth/create-super-admin
Content-Type: application/json

{
  "first_name": "System",
  "last_name": "Administrator",
  "email": "superadmin@nmsme-awards.org",
  "phone": "+2348012345678",
  "password": "SuperAdmin2024!",
  "confirm_password": "SuperAdmin2024!",
  "security_key": "NMSME_SUPER_ADMIN_2024",
  "admin_credentials": {
    "title": "System Administrator",
    "institution": "nMSME Awards Portal",
    "department": "System Administration"
  }
}
```

### **2. Create Judge (Super Admin Only)**
```http
POST /api/admin/judges/create
Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "first_name": "Adnan",
  "last_name": "Mukhtar",
  "email": "adnanmukhtar2321@gmail.com",
  "phone": "+2348012345678",
  "password": "ad0701131nan",
  "expertise_sectors": ["fashion", "it", "agribusiness"],
  "professional_credentials": {
    "title": "Business Consultant",
    "institution": "Independent Practice",
    "department": "Business Development",
    "years_of_experience": 5,
    "qualifications": ["Bachelor of Business Administration"],
    "areas_of_expertise": ["Business Strategy", "Market Analysis"]
  },
  "availability": {
    "max_applications_per_round": 25,
    "preferred_categories": ["fashion", "it", "agribusiness"]
  }
}
```

## 🔐 **Authentication & Authorization**

### **User Roles Hierarchy**
1. **`super_admin`** - Full system access, can create admins and judges
2. **`admin`** - Administrative access, can manage applications and users
3. **`judge`** - Can review and score assigned applications
4. **`applicant`** - Can submit applications and view their status

### **Permission Levels**
- **Super Admin**: All permissions including user creation
- **Admin**: Application management, user management, analytics
- **Judge**: Application review and scoring only

## 🚨 **Security Features**

### **1. Security Key Protection**
- Super admin creation requires a secret security key
- Key is stored in environment variables
- Prevents unauthorized super admin creation

### **2. Role-Based Access Control**
- Each endpoint checks user role and permissions
- Middleware validates access before allowing operations
- Audit trail for all administrative actions

### **3. JWT Token Security**
- Tokens expire after configured time
- Secure token generation and validation
- Protected routes require valid tokens

## 📁 **Generated Files**

After running the scripts, you'll have:
- `super-admin-token.json` - Contains super admin JWT token
- `judge-credentials.json` - Contains judge user credentials

## 🧪 **Testing the System**

### **1. Test Super Admin Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@nmsme-awards.org",
    "password": "SuperAdmin2024!"
  }'
```

### **2. Test Judge Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "adnanmukhtar2321@gmail.com",
    "password": "ad0701131nan"
  }'
```

## 🔧 **Troubleshooting**

### **Common Issues**

1. **"Super admin already exists"**
   - Only one super admin is allowed per system
   - Delete existing super admin from database if needed

2. **"Invalid security key"**
   - Check `SUPER_ADMIN_SECURITY_KEY` in environment
   - Default key is `NMSME_SUPER_ADMIN_2024`

3. **"Admin profile not found"**
   - Ensure Admin model is properly imported
   - Check database connection

4. **"Permission denied"**
   - Verify user role is correct
   - Check middleware configuration

## 📞 **Support**

If you encounter any issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure database is running and accessible
4. Check that all models are properly imported

---

**🎉 Congratulations! You now have a fully functional super admin system for the nMSME Awards Portal!**
