const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config({ path: './config.env' });

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const applicationRoutes = require('./routes/applications');
const documentRoutes = require('./routes/documents');
const dashboardRoutes = require('./routes/dashboard');
const judgeRoutes = require('./routes/judge');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const categoryRoutes = require('./routes/categories');

const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

app.use(helmet());

app.options('*', cors());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://n-msme-frontend.vercel.app',
      'http://kasedaaward.com',
      'https://kasedaaward.com',
      'https://nmsmeadmin.vercel.app',
      process.env.APP_URL
    ].filter(Boolean);
    
    console.log('CORS check - Origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.includes('kasedaaward.com') ||
        origin.includes('nmsmeadmin.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')) {
      console.log('CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Auth-Token',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'nMSME Awards Portal API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'nMSME Awards Portal API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.get('/api/cors-test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

app.options('*', cors());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/categories', categoryRoutes);

app.use(notFound);
app.use(errorHandler);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'nmsme_awards'
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

module.exports = app;
