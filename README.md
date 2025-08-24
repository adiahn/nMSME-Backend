# nMSME Awards Portal Backend

A comprehensive backend API for the nMSME Awards Portal, supporting user registration, application submission, judging, and results management for nano, micro, and small enterprises in Katsina.

## 🚀 Features

- **User Authentication**: JWT-based authentication with email verification
- **Role-Based Access Control**: Support for applicants, judges, admins, and sponsors
- **Application Management**: Complete application lifecycle from draft to approval
- **File Upload**: Cloudinary integration for document and media uploads
- **Email Notifications**: Nodemailer integration for automated emails
- **MongoDB Atlas**: Cloud database with proper indexing and relationships
- **Security**: Rate limiting, input validation, and data protection

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary
- **Email Service**: Nodemailer
- **Authentication**: JWT
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- Cloudinary account
- Email service (Gmail, SendGrid, etc.)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nMSME-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Copy the `config.env` file and update with your credentials:
   ```bash
   cp config.env .env
   ```
   
   Update the following variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A strong secret key for JWT tokens
   - `CLOUDINARY_*`: Your Cloudinary credentials
   - `EMAIL_*`: Your email service credentials

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📁 Project Structure

```
nMSME-Backend/
├── models/                 # Database models
│   ├── User.js
│   ├── BusinessProfile.js
│   └── Application.js
├── routes/                 # API routes
│   ├── auth.js
│   ├── user.js
│   ├── applications.js
│   ├── documents.js
│   ├── dashboard.js
│   ├── judge.js
│   ├── admin.js
│   └── public.js
├── middleware/             # Custom middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── notFound.js
├── utils/                  # Utility functions
│   └── emailService.js
├── server.js              # Main server file
├── package.json
├── config.env             # Environment variables
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/logout` - User logout

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/business-profile` - Create/update business profile

### Applications
- `GET /api/applications` - Get user's applications
- `GET /api/applications/:id` - Get specific application
- `POST /api/applications` - Create new application
- `PUT /api/applications/:id` - Update application
- `POST /api/applications/:id/submit` - Submit application
- `DELETE /api/applications/:id` - Delete application

### Documents
- `POST /api/applications/:id/documents` - Upload documents
- `DELETE /api/documents/:id` - Delete document

### Dashboard
- `GET /api/dashboard/home` - Dashboard home data
- `GET /api/dashboard/application-status` - Application timeline status

### Judge Routes
- `GET /api/judge/applications` - Get assigned applications
- `GET /api/judge/applications/:id` - Get application for judging
- `POST /api/judge/applications/:id/score` - Submit application score
- `POST /api/judge/applications/:id/conflict` - Declare conflict of interest

### Admin Routes
- `GET /api/admin/dashboard` - Admin dashboard statistics
- `GET /api/admin/applications` - Get all applications
- `PUT /api/admin/applications/:id/status` - Update application status
- `GET /api/admin/judges` - Get all judges
- `POST /api/admin/judges/:id/assign` - Assign applications to judge
- `PUT /api/admin/timeline` - Update application timeline
- `GET /api/admin/scores` - Get all application scores
- `POST /api/admin/shortlist` - Generate shortlist

### Public Routes
- `GET /api/public/categories` - Get award categories
- `GET /api/public/winners` - Get announced winners
- `GET /api/public/timeline` - Get public timeline

## 🗄 Database Schema

### Users Collection
- Basic user information (name, email, phone)
- Authentication details (password hash, verification tokens)
- Role-based access control
- Account status and verification

### Business Profiles Collection
- Business registration details (CAC number, sector)
- MSME classification and metrics
- Location and contact information
- Business description and social media links

### Applications Collection
- Application details and content
- Document attachments
- Status tracking and workflow
- Review comments and scoring

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with configurable rounds
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Secure cross-origin requests
- **Helmet Security**: HTTP security headers
- **File Upload Security**: Validation and virus scanning

## 📧 Email Integration

The system uses Nodemailer for automated emails:
- Email verification during registration
- Password reset requests
- Application status notifications
- Welcome emails

## ☁️ File Storage

Cloudinary integration for:
- CAC registration documents
- Tax identification documents
- Product/service photos
- Pitch videos

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set:
- Database connection
- JWT secrets
- Cloudinary credentials
- Email service credentials
- Application URLs

### Production Considerations
- Use strong JWT secrets
- Enable HTTPS
- Configure proper CORS origins
- Set up monitoring and logging
- Implement backup strategies

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 API Documentation

The API follows RESTful conventions with consistent response formats:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [ ... ]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**nMSME Awards Portal Backend** - Empowering nano, micro, and small enterprises through digital awards management.
