# 🔐 Secure Exam Portal - Real Backend

A production-grade backend for the Exam Portal application with enterprise-level security features.

## ✨ Features

### 🔐 Security (NIST SP 800-63-2 Compliant)

- **Authentication**
  - Username/password login with bcrypt hashing
  - Multi-factor authentication (OTP)
  - JWT token-based sessions

- **Authorization**
  - Access Control List (ACL) with 3 roles:
    - `STUDENT`: Submit assignments, view grades
    - `FACULTY`: Grade assignments, view submissions
    - `ADMIN`: Manage users, audit logs
  - Fine-grained permission control on all endpoints

- **Encryption**
  - AES-256-CBC encryption for sensitive data
  - Secure IV (Initialization Vector) generation
  - Real cryptographic implementation using Node.js crypto module

- **Data Integrity**
  - HMAC-SHA256 digital signatures
  - Salt-based password hashing (bcrypt)
  - Tamper detection

- **Audit & Logging**
  - Complete action logging with timestamps
  - User identification and tracking
  - IP address and user agent logging
  - Compliance with security standards

## 🚀 Quick Start

### Prerequisites

- Node.js v16+
- MongoDB 4.4+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start MongoDB
mongod

# Start server
npm start
```

Server runs on `http://localhost:5000`

## 📋 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "student1",
  "password": "secure_password",
  "email": "student@example.com",
  "role": "STUDENT"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "username": "student1",
    "role": "STUDENT",
    "email": "student@example.com"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "student1",
  "password": "secure_password"
}

Response:
{
  "success": true,
  "message": "OTP sent. Check console for OTP",
  "mfaRequired": true,
  "userId": "uuid",
  "username": "student1",
  "role": "STUDENT",
  "otpId": "otp-uuid"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "userId": "uuid",
  "otpCode": "123456"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "student1",
    "role": "STUDENT",
    "email": "student@example.com"
  }
}
```

### Assignment Endpoints

#### Submit Assignment
```http
POST /api/assignments/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "filename": "assignment.pdf",
  "content": "base64_encoded_file_content"
}

Response:
{
  "success": true,
  "message": "Assignment submitted successfully",
  "assignment": {
    "id": "uuid",
    "filename": "assignment.pdf",
    "submittedAt": "2024-01-18T10:30:00Z"
  }
}
```

#### Get Assignments
```http
GET /api/assignments
Authorization: Bearer {token}

Response:
{
  "success": true,
  "assignments": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "studentName": "student1",
      "filename": "assignment.pdf",
      "submittedAt": "2024-01-18T10:30:00Z",
      "grade": "A",
      "gradedBy": "faculty1",
      "feedback": "Excellent work!",
      "gradedAt": "2024-01-18T14:30:00Z"
    }
  ]
}
```

#### Grade Assignment
```http
POST /api/assignments/{assignmentId}/grade
Authorization: Bearer {token}
Content-Type: application/json

{
  "grade": "A",
  "feedback": "Excellent work! Well done."
}

Response:
{
  "success": true,
  "message": "Assignment graded successfully",
  "assignment": {
    "id": "uuid",
    "grade": "A",
    "gradedAt": "2024-01-18T14:30:00Z"
  }
}
```

### Dashboard Endpoints

#### Student Dashboard
```http
GET /api/dashboard/student
Authorization: Bearer {token}

Response:
{
  "success": true,
  "dashboard": {
    "username": "student1",
    "totalAssignments": 5,
    "gradedAssignments": 3,
    "pendingGrade": 2,
    "recentAssignments": [...]
  }
}
```

#### Faculty Dashboard
```http
GET /api/dashboard/faculty
Authorization: Bearer {token}

Response:
{
  "success": true,
  "dashboard": {
    "totalAssignments": 25,
    "gradedAssignments": 20,
    "pendingGrade": 5,
    "recentSubmissions": [...]
  }
}
```

#### Admin Dashboard
```http
GET /api/dashboard/admin
Authorization: Bearer {token}

Response:
{
  "success": true,
  "dashboard": {
    "totalUsers": 50,
    "usersByRole": {
      "students": 40,
      "faculty": 8,
      "admins": 2
    },
    "totalAssignments": 100,
    "totalLogs": 500,
    "recentLogs": [...]
  }
}
```

### Audit Log Endpoints

#### Get All Logs
```http
GET /api/logs
Authorization: Bearer {token}

Response:
{
  "success": true,
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "student1",
      "action": "UPLOAD_ENCRYPTED",
      "resource": "ASSIGNMENT",
      "details": "File assignment.pdf encrypted and signed",
      "timestamp": "2024-01-18T10:30:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "totalLogs": 100
}
```

## 🗄️ Database Schema

### User Collection
```javascript
{
  id: String (UUID),
  username: String (unique),
  email: String (unique),
  passwordHash: String,
  salt: String,
  role: String (STUDENT | FACULTY | ADMIN),
  mfaEnabled: Boolean,
  mfaSecret: String,
  otpCode: String,
  otpExpiry: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Assignment Collection
```javascript
{
  id: String (UUID),
  studentId: String,
  studentName: String,
  filename: String,
  encryptedContent: String,
  digitalSignature: String,
  grade: String,
  gradedBy: String,
  feedback: String,
  timestamp: Date,
  submittedAt: Date,
  gradedAt: Date
}
```

### AuditLog Collection
```javascript
{
  id: String (UUID),
  userId: String,
  username: String,
  action: String,
  resource: String,
  details: String,
  timestamp: Date,
  ipAddress: String,
  userAgent: String
}
```

## 🔑 Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/exam-portal
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=24h
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
NODE_ENV=development
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 📊 ACL Matrix (Authorization Policy)

### STUDENT
- `ASSIGNMENT`: CREATE, READ
- `GRADE`: READ
- `AUDIT_LOG`: None

### FACULTY
- `ASSIGNMENT`: READ, UPDATE
- `GRADE`: CREATE, READ, UPDATE
- `AUDIT_LOG`: READ

### ADMIN
- `ASSIGNMENT`: READ, DELETE
- `GRADE`: READ
- `AUDIT_LOG`: READ, DELETE

## 🔒 Security Implementation Details

### Password Hashing
- Algorithm: bcrypt
- Salt rounds: 10
- Automatically generated and stored

### Encryption
- Algorithm: AES-256-CBC
- IV: 16-byte random vector
- Mode: Cipher Block Chaining

### Digital Signatures
- Algorithm: HMAC-SHA256
- Key: JWT_SECRET
- Purpose: Data integrity verification

### JWT Tokens
- Algorithm: HS256
- Expiry: Configurable (default: 24h)
- Contains: userId, username, role

### OTP
- Length: 6 digits
- Expiry: 5 minutes
- Storage: MongoDB with expiry tracking

## 🧪 Testing

### Test Accounts

```
Admin:
  username: admin
  password: admin123
  OTP: Check console when logging in

Faculty:
  username: faculty
  password: faculty123
  OTP: Check console when logging in
```

### Test Workflow

1. Register new student account
2. Login with credentials
3. Enter OTP from console
4. Submit assignment
5. Login as faculty
6. Grade assignment
7. Login as admin
8. View audit logs

## 📚 Key Files

| File | Purpose |
|------|---------|
| `server.js` | Main Express application |
| `models.js` | MongoDB schemas |
| `routes.js` | API endpoint definitions |
| `security.js` | Cryptographic functions |
| `middleware.js` | Authentication & authorization |
| `.env` | Environment configuration |

## 🚨 Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error responses include detailed messages:

```json
{
  "error": "Error message describing what went wrong"
}
```

## 🔄 CORS Configuration

The backend accepts requests from:
- `http://localhost:5173` (Frontend development)
- `http://localhost:3000` (Alternative)

Configure in `server.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
```

## 📈 Performance Considerations

- Database indexing on frequently queried fields
- JWT token caching
- OTP cleanup (automatic expiry)
- Efficient encryption/decryption

## 🔐 Security Best Practices

- ✅ Never commit `.env` to repository
- ✅ Use environment variables for secrets
- ✅ Validate all user inputs
- ✅ Use HTTPS in production
- ✅ Implement rate limiting
- ✅ Keep dependencies updated
- ✅ Use strong JWT secrets
- ✅ Enable MongoDB authentication
- ✅ Regular security audits
- ✅ Implement CSRF protection

## 🐛 Debugging

Enable debugging output:

```bash
DEBUG=* npm start
```

Check MongoDB connection:

```bash
mongosh
use exam-portal
db.users.find()
```

## 📞 Support

For issues or questions:
1. Check SETUP_GUIDE.md
2. Review API documentation
3. Check server console output
4. Verify MongoDB is running
5. Ensure .env is properly configured

## 📄 License

This project is for educational purposes.

---

**Built with ❤️ for security and education** 🎓
