import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  id: String,
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  salt: String,
  role: { type: String, enum: ['STUDENT', 'FACULTY', 'ADMIN'], required: true },
  mfaEnabled: { type: Boolean, default: true },
  mfaSecret: String,
  otpCode: String,
  otpExpiry: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Assignment Schema
const assignmentSchema = new mongoose.Schema({
  id: String,
  studentId: String,
  studentName: String,
  filename: String,
  contentType: String,
  isBinary: { type: Boolean, default: false },
  encryptedContent: String,
  digitalSignature: String,
  grade: String,
  gradedBy: String,
  feedback: String,
  timestamp: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: Date.now },
  gradedAt: Date
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  id: String,
  userId: String,
  username: String,
  action: String,
  resource: String,
  details: String,
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String
});

// OTP Schema for MFA
const otpSchema = new mongoose.Schema({
  id: String,
  userId: String,
  username: String,
  otpCode: String,
  expiresAt: Date,
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const Assignment = mongoose.model('Assignment', assignmentSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const OTP = mongoose.model('OTP', otpSchema);
