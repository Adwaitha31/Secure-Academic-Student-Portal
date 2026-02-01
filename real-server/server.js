import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-portal';

/**
 * MIDDLEWARE
 */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * DATABASE CONNECTION
 */
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${MONGODB_URI}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Make sure MongoDB is running locally');
  });

/**
 * ROUTES
 */
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Secure Exam Portal Backend',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verifyOTP: 'POST /api/auth/verify-otp'
      },
      assignments: {
        submit: 'POST /api/assignments/submit',
        getAll: 'GET /api/assignments',
        grade: 'POST /api/assignments/:assignmentId/grade'
      },
      dashboard: {
        student: 'GET /api/dashboard/student',
        faculty: 'GET /api/dashboard/faculty',
        admin: 'GET /api/dashboard/admin'
      },
      logs: 'GET /api/logs',
      system: 'GET /api/system/acl'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * START SERVER
 */
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   SECURE EXAM PORTAL - BACKEND SERVER         ║
║   🚀 Server running on http://localhost:${PORT}  ║
╚════════════════════════════════════════════════╝

Security Features:
✅ NIST SP 800-63-2 Authentication
✅ Multi-Factor Authentication (OTP)
✅ AES-256 Encryption
✅ HMAC Digital Signatures
✅ Bcrypt Password Hashing
✅ JWT Token Authentication
✅ Access Control List (ACL)
✅ Audit Logging

API Documentation: http://localhost:${PORT}/

Note: Make sure MongoDB is running on localhost:27017
  `);
});
