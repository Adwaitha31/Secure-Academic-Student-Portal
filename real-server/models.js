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
  // Login attempt tracking for security
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Assignment Task Schema (Faculty creates these)
const assignmentTaskSchema = new mongoose.Schema({
  id: String,
  title: { type: String, required: true },
  description: String,
  createdBy: String,
  createdByName: String,
  deadline: { type: Date, required: true },
  maxMarks: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// Submission Schema (Student submissions)
const submissionSchema = new mongoose.Schema({
  id: String,
  assignmentTaskId: String,
  assignmentTaskTitle: String,
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
  isLate: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  gradedAt: Date
});

// Announcement Schema
const announcementSchema = new mongoose.Schema({
  id: String,
  title: { type: String, required: true },
  content: { type: String, required: true },
  postedBy: String,
  postedByName: String,
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
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
export const AssignmentTask = mongoose.model('AssignmentTask', assignmentTaskSchema);
export const Submission = mongoose.model('Submission', submissionSchema);
export const Announcement = mongoose.model('Announcement', announcementSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const OTP = mongoose.model('OTP', otpSchema);

// Keep old Assignment model for backward compatibility
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
export const Assignment = mongoose.model('Assignment', assignmentSchema);
