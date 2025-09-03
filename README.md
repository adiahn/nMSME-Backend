# 🚀 nMSME Awards Portal Backend

A comprehensive backend API for the nMSME Awards Portal, supporting user registration, application submission, judging, and results management for nano, micro, and small enterprises in Katsina.

## 📚 **Documentation**

**All comprehensive documentation has been moved to the [`docs/`](./docs/) folder.**

- 📖 **[Complete Documentation Index](./docs/README.md)**
- 🔧 **[API Documentation](./docs/API_Documentation.txt)**
- 🚀 **[Judge Dashboard Implementation Guide](./docs/JUDGE_DASHBOARD_IMPLEMENTATION_GUIDE.md)**
- 📋 **[Application Requirements](./docs/APPLICATION_REQUIREMENTS.md)**
- 🛠️ **[Scripts Documentation](./scripts/README.md)**

## 🚀 **Quick Start**

```bash
# Install dependencies
npm install

# Configure environment
cp config.env.example config.env
# Edit config.env with your credentials

# Start development server
npm run dev

# Check health endpoint
curl http://localhost:5000/health
```

## 🛠 **Tech Stack**

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary
- **Email Service**: Nodemailer
- **Authentication**: JWT
- **Security**: Helmet, CORS, Rate limiting

## 📁 **Project Structure**

```
nMSME-Backend/
├── docs/                   # 📚 All documentation
├── scripts/                # 🛠️ Utility and testing scripts
├── models/                 # Database models
├── routes/                 # API routes
├── middleware/             # Custom middleware
├── controllers/            # Route controllers
├── utils/                  # Utility functions
├── server.js              # Main server file
└── config.env             # Environment variables
```

## 🔐 **Key Features**

- **User Authentication**: JWT-based with email verification
- **Role-Based Access Control**: Applicants, judges, admins, sponsors
- **Application Management**: Complete lifecycle management
- **File Upload**: Cloudinary integration
- **Email Notifications**: Automated email system
- **Security**: Rate limiting, validation, CORS protection

## 📖 **For Developers**

1. **Start with**: [`docs/JUDGE_DASHBOARD_IMPLEMENTATION_GUIDE.md`](./docs/JUDGE_DASHBOARD_IMPLEMENTATION_GUIDE.md)
2. **API Reference**: [`docs/API_Documentation.txt`](./docs/API_Documentation.txt)
3. **Examples**: [`docs/API_PAYLOAD_EXAMPLES.md`](./docs/API_PAYLOAD_EXAMPLES.md)

## 🐛 **Troubleshooting**

- **CORS Issues**: Check [`docs/CORS_FIX_REPORT.txt`](./docs/CORS_FIX_REPORT.txt)
- **Frontend Integration**: Review [`docs/FRONTEND_INTEGRATION_FIXES.md`](./docs/FRONTEND_INTEGRATION_FIXES.md)
- **Known Issues**: See [`docs/FRONTEND_CRITICAL_ISSUE_REPORT.txt`](./docs/FRONTEND_CRITICAL_ISSUE_REPORT.txt)

## 📞 **Support**

- **Documentation**: [`docs/README.md`](./docs/README.md)
- **Last Updated**: August 31, 2025
- **Status**: Active Development

---

**📚 [View Complete Documentation →](./docs/README.md)**
