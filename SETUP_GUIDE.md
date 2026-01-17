# Secure Exam Portal - Real Backend Setup Guide

## 📋 Overview

This guide will help you set up and run the **real backend** for your Secure Exam Portal application. The system includes:

- ✅ **Express.js Backend Server**
- ✅ **MongoDB Database** 
- ✅ **Real User Authentication** with JWT tokens
- ✅ **Multi-Factor Authentication (MFA)** with OTP
- ✅ **AES-256 Encryption** for assignment content
- ✅ **HMAC Digital Signatures** for data integrity
- ✅ **Access Control List (ACL)** enforcement
- ✅ **Audit Logging** for all actions
- ✅ **NIST SP 800-63-2 Compliance**

---

## 🔧 Prerequisites

Make sure you have installed:

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** (Community Edition) - [Download](https://www.mongodb.com/try/download/community)
3. **npm** or **yarn** (comes with Node.js)

---

## 📦 Installation Steps

### Step 1: Install Backend Dependencies

Navigate to the backend directory and install packages:

```bash
cd real-server
npm install
```

This will install:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cors` - Cross-Origin Resource Sharing
- `dotenv` - Environment variables
- `nodemailer` - Email sending (optional)

### Step 2: Start MongoDB

**On Windows (if MongoDB is installed):**
```bash
mongod
```

**On macOS/Linux:**
```bash
mongod
```

**Or use MongoDB Atlas (Cloud):**
- Create account at https://www.mongodb.com/cloud/atlas
- Update `MONGODB_URI` in `.env` file with your connection string

### Step 3: Configure Environment Variables

Edit the `.env` file in `real-server/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/exam-portal
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=24h
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
NODE_ENV=development
```

⚠️ **Important:** Change `JWT_SECRET` and `ENCRYPTION_KEY` in production!

### Step 4: Start the Backend Server

```bash
npm start
```

You should see:

```
╔════════════════════════════════════════════════╗
║   SECURE EXAM PORTAL - BACKEND SERVER         ║
║   🚀 Server running on http://localhost:5000  ║
╚════════════════════════════════════════════════╝
```

### Step 5: Start the Frontend (in another terminal)

From the main project directory:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

---

## 🧪 Testing the Application

### Test User Accounts

Once the backend starts, here are default test credentials:

**Admin:**
- Username: `admin`
- Password: `admin123`
- Role: ADMIN

**Faculty:**
- Username: `faculty`
- Password: `faculty123`
- Role: FACULTY

**Student (register a new one):**
- Username: `student1`
- Password: `student123`
- Role: STUDENT

### Test Workflow

1. **Register a Student:**
   - Go to Register page
   - Enter username, password, select STUDENT role
   - Click Register

2. **Login as Student:**
   - Use the registered credentials
   - You'll receive an OTP in console (dev mode)
   - Enter OTP to complete login
   - View Student Dashboard

3. **Submit Assignment (as Student):**
   - Click "Submit Assignment"
   - Upload a file
   - Content is encrypted and signed

4. **Login as Faculty:**
   - Use `faculty` / `faculty123`
   - View all submissions
   - Grade assignments with feedback

5. **Login as Admin:**
   - Use `admin` / `admin123`
   - View all audit logs
   - See system statistics

---

## 🔒 Security Features Implemented

### 1. Authentication (NIST SP 800-63-2)
- ✅ Username/password registration
- ✅ Secure password hashing with bcrypt (10 salt rounds)
- ✅ JWT token-based sessions

### 2. Multi-Factor Authentication (MFA)
- ✅ OTP generation (6-digit code)
- ✅ OTP expiry (5 minutes)
- ✅ Verification on login

### 3. Authorization (Access Control)
- ✅ ACL Matrix with 3 roles (STUDENT, FACULTY, ADMIN)
- ✅ 3 resources (ASSIGNMENT, GRADE, AUDIT_LOG)
- ✅ Enforced permissions on every endpoint

### 4. Encryption
- ✅ AES-256-CBC encryption for assignment content
- ✅ Secure IV (Initialization Vector) generation
- ✅ Real crypto module implementation

### 5. Hashing & Digital Signatures
- ✅ HMAC-SHA256 digital signatures
- ✅ Password salting with bcrypt
- ✅ Data integrity verification

### 6. Encoding
- ✅ Base64 encoding for encrypted data
- ✅ Hexadecimal encoding for binary data

### 7. Audit Logging
- ✅ All actions logged with timestamp
- ✅ User identification
- ✅ IP address tracking
- ✅ User agent logging

---

## 📊 API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login with credentials
POST   /api/auth/verify-otp        - Verify OTP and get token
```

### Assignments
```
POST   /api/assignments/submit     - Submit assignment
GET    /api/assignments            - Get assignments
POST   /api/assignments/:id/grade  - Grade assignment
```

### Dashboards
```
GET    /api/dashboard/student      - Student dashboard
GET    /api/dashboard/faculty      - Faculty dashboard
GET    /api/dashboard/admin        - Admin dashboard
```

### Audit Logs
```
GET    /api/logs                   - Get all audit logs
```

### System
```
GET    /api/system/acl             - Get ACL matrix
```

---

## 🐛 Troubleshooting

### Error: "MongoDB connection failed"
- ✅ Make sure `mongod` is running
- ✅ Check MONGODB_URI in `.env`
- ✅ Verify MongoDB is installed

### Error: "Port 5000 already in use"
- Change `PORT` in `.env` file
- Or kill the process: `lsof -ti:5000 | xargs kill -9`

### OTP not showing
- Check browser console during login
- OTP is printed to server console in development mode
- In production, configure email sending via `nodemailer`

### Frontend can't connect to backend
- Ensure backend is running on `http://localhost:5000`
- Check CORS settings in `server.js`
- Clear browser cache and localStorage

### Database errors
- Check MongoDB logs
- Verify connection string is correct
- Ensure database user has proper permissions

---

## 📝 Evaluation Checklist

Your lab evaluation should cover:

- [ ] **Authentication (1.5 marks)**
  - Single-factor: Username/password login
  - Multi-factor: OTP verification

- [ ] **Authorization (3 marks)**
  - ACL Matrix: 3 subjects × 3 objects
  - Policy Definition & Justification
  - Programmatic Enforcement

- [ ] **Encryption (3 marks)**
  - Key Generation (crypto module)
  - AES-256 Encryption/Decryption

- [ ] **Hashing & Digital Signatures (3 marks)**
  - Password hashing with salt (bcrypt)
  - HMAC-SHA256 digital signatures

- [ ] **Encoding (3 marks)**
  - Base64 encoding implementation
  - Security theory documentation

- [ ] **Total: 15 marks**

---

## 🚀 Deployment (Future)

For production deployment:

1. Use MongoDB Atlas (cloud database)
2. Deploy to Heroku, Railway, or Vercel
3. Use environment variables for secrets
4. Enable HTTPS/TLS
5. Set secure CORS origins
6. Configure real email for OTP sending

---

## 📚 Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [NIST SP 800-63-2](https://pages.nist.gov/800-63-3/)
- [JWT.io](https://jwt.io/)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)

---

## ✅ Next Steps

1. ✅ Start MongoDB
2. ✅ Run `npm install` in `real-server/`
3. ✅ Start backend: `npm start`
4. ✅ Start frontend: `npm run dev`
5. ✅ Test with provided credentials
6. ✅ Demonstrate to your teacher!

Good luck with your viva! 🎓
