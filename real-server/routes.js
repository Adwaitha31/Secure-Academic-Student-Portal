import express from 'express';
import { User, Assignment, AuditLog, OTP } from './models.js';
import {
  hashPassword,
  verifyPassword,
  generateOTP,
  encryptData,
  decryptData,
  generateSignature,
  generateJWT,
  generateSalt
} from './security.js';
import { authenticate, authorize, logAuditEvent } from './middleware.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * AUTHENTICATION ROUTES
 */

// Register User
router.post('/auth/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    // Validation
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password with bcrypt
    const { hash: passwordHash, salt } = await hashPassword(password);

    // Create new user
    const newUser = new User({
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash,
      salt,
      role,
      mfaEnabled: true,
      createdAt: new Date()
    });

    await newUser.save();

    // Log the registration
    await logAuditEvent(
      newUser.id,
      username,
      'REGISTER',
      'AUTH',
      `User registered with role ${role}`,
      req
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login User
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate OTP for MFA
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to database
    const otp = new OTP({
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      otpCode,
      expiresAt: otpExpiry,
      verified: false,
      createdAt: new Date()
    });

    await otp.save();

    // Log login attempt
    await logAuditEvent(
      user.id,
      username,
      'LOGIN_INITIATED',
      'AUTH',
      'User initiated login, OTP sent',
      req
    );

    // In production, send OTP via email
    console.log(`\n=== OTP FOR ${username} ===\nOTP: ${otpCode}\n`);

    res.json({
      success: true,
      message: 'OTP sent. Check console for OTP (in dev mode)',
      mfaRequired: true,
      userId: user.id,
      username: user.username,
      role: user.role,
      otpId: otp.id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify OTP and Complete Login
router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { userId, otpCode } = req.body;

    if (!userId || !otpCode) {
      return res.status(400).json({ error: 'Missing OTP or userId' });
    }

    // Find OTP
    const otp = await OTP.findOne({ userId, otpCode });
    if (!otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // Check OTP expiry
    if (new Date() > otp.expiresAt) {
      return res.status(401).json({ error: 'OTP expired' });
    }

    // Find user
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Mark OTP as verified
    otp.verified = true;
    await otp.save();

    // Generate JWT token
    const token = generateJWT(user.id, user.username, user.role);

    // Log successful login
    await logAuditEvent(
      user.id,
      user.username,
      'LOGIN_SUCCESS',
      'AUTH',
      'User successfully authenticated with MFA',
      req
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

/**
 * ASSIGNMENT ROUTES
 */

// Submit Assignment (Students)
router.post('/assignments/submit', authenticate, authorize('ASSIGNMENT', 'CREATE'), async (req, res) => {
  try {
    const { filename, content, contentType, isBinary } = req.body;
    const { userId, username } = req.user;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content required' });
    }

    // Encrypt content (content may be plain text or base64 for binaries)
    const encryptedContent = encryptData(content);

    // Generate digital signature
    const digitalSignature = generateSignature(content);

    // Create assignment
    const assignment = new Assignment({
      id: crypto.randomUUID(),
      studentId: userId,
      studentName: username,
      filename,
      contentType: contentType || 'application/octet-stream',
      isBinary: !!isBinary,
      encryptedContent,
      digitalSignature,
      timestamp: new Date(),
      submittedAt: new Date()
    });

    await assignment.save();

    // Log action
    await logAuditEvent(
      userId,
      username,
      'UPLOAD_ENCRYPTED',
      'ASSIGNMENT',
      `File ${filename} encrypted and signed`,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully',
      assignment: {
        id: assignment.id,
        filename: assignment.filename,
        submittedAt: assignment.submittedAt
      }
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// Get Assignments
router.get('/assignments', authenticate, authorize('ASSIGNMENT', 'READ'), async (req, res) => {
  try {
    const { userId, role } = req.user;

    let query = {};

    // Students see only their assignments
    if (role === 'STUDENT') {
      query.studentId = userId;
    }

    const assignments = await Assignment.find(query).sort({ submittedAt: -1 });

    // Decrypt content for response (only if user can read it)
    const assignmentsWithDecrypted = assignments.map(a => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.studentName,
      filename: a.filename,
      contentType: a.contentType,
      isBinary: a.isBinary,
      submittedAt: a.submittedAt,
      grade: a.grade,
      gradedBy: a.gradedBy,
      feedback: a.feedback,
      gradedAt: a.gradedAt,
      digitalSignature: a.digitalSignature
    }));

    res.json({
      success: true,
      assignments: assignmentsWithDecrypted
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Decrypt Assignment Content (Faculty/Admin)
router.get('/assignments/:assignmentId/decrypt', authenticate, authorize('ASSIGNMENT', 'READ'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { role } = req.user;

    // Only faculty and admin can decrypt
    if (role !== 'FACULTY' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to decrypt content' });
    }

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Decrypt content
    const decryptedContent = decryptData(assignment.encryptedContent);

    res.json({
      success: true,
      decryptedContent,
      isBinary: assignment.isBinary,
      contentType: assignment.contentType,
      filename: assignment.filename
    });
  } catch (error) {
    console.error('Decrypt assignment error:', error);
    res.status(500).json({ error: 'Failed to decrypt assignment' });
  }
});

// Download decrypted assignment (Faculty/Admin)
router.get('/assignments/:assignmentId/download', authenticate, authorize('ASSIGNMENT', 'READ'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { role } = req.user;

    if (role !== 'FACULTY' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to download content' });
    }

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const decryptedContent = decryptData(assignment.encryptedContent);

    const safeName = assignment.filename || 'submission.bin';
    const contentType = assignment.contentType || 'application/octet-stream';

    if (assignment.isBinary) {
      const buffer = Buffer.from(decryptedContent, 'base64');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      return res.send(buffer);
    }

    // Text content
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.send(decryptedContent);
  } catch (error) {
    console.error('Download assignment error:', error);
    res.status(500).json({ error: 'Failed to download assignment' });
  }
});

// Grade Assignment (Faculty)
router.post('/assignments/:assignmentId/grade', authenticate, authorize('GRADE', 'CREATE'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { grade, feedback } = req.body;
    const { userId, username } = req.user;

    if (!grade) {
      return res.status(400).json({ error: 'Grade required' });
    }

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Update assignment
    assignment.grade = grade;
    assignment.gradedBy = username;
    assignment.feedback = feedback || '';
    assignment.gradedAt = new Date();

    await assignment.save();

    // Log action
    await logAuditEvent(
      userId,
      username,
      'GRADE_ASSIGNMENT',
      'GRADE',
      `Graded assignment ${assignmentId} with ${grade}`,
      req
    );

    res.json({
      success: true,
      message: 'Assignment graded successfully',
      assignment: {
        id: assignment.id,
        grade: assignment.grade,
        gradedAt: assignment.gradedAt
      }
    });
  } catch (error) {
    console.error('Grade assignment error:', error);
    res.status(500).json({ error: 'Failed to grade assignment' });
  }
});

/**
 * AUDIT LOG ROUTES
 */

// Get Audit Logs (Admin/Faculty)
router.get('/logs', authenticate, authorize('AUDIT_LOG', 'READ'), async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(100);

    res.json({
      success: true,
      logs,
      totalLogs: logs.length
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * DASHBOARD ROUTES
 */

// Get Student Dashboard
router.get('/dashboard/student', authenticate, async (req, res) => {
  try {
    const { userId, username } = req.user;

    const assignments = await Assignment.find({ studentId: userId });
    const submittedCount = assignments.length;
    const gradedCount = assignments.filter(a => a.grade).length;

    res.json({
      success: true,
      dashboard: {
        username,
        totalAssignments: submittedCount,
        gradedAssignments: gradedCount,
        pendingGrade: submittedCount - gradedCount,
        recentAssignments: assignments.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Get Faculty Dashboard
router.get('/dashboard/faculty', authenticate, async (req, res) => {
  try {
    const assignments = await Assignment.find({});
    const gradedCount = assignments.filter(a => a.grade).length;

    res.json({
      success: true,
      dashboard: {
        totalAssignments: assignments.length,
        gradedAssignments: gradedCount,
        pendingGrade: assignments.length - gradedCount,
        recentSubmissions: assignments.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Faculty dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Get Admin Dashboard
router.get('/dashboard/admin', authenticate, async (req, res) => {
  try {
    const users = await User.find({});
    const assignments = await Assignment.find({});
    const logs = await AuditLog.find({});

    res.json({
      success: true,
      dashboard: {
        totalUsers: users.length,
        usersByRole: {
          students: users.filter(u => u.role === 'STUDENT').length,
          faculty: users.filter(u => u.role === 'FACULTY').length,
          admins: users.filter(u => u.role === 'ADMIN').length
        },
        totalAssignments: assignments.length,
        totalLogs: logs.length,
        recentLogs: logs.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

/**
 * SYSTEM INFO
 */

// ACL Matrix Info
router.get('/system/acl', authenticate, (req, res) => {
  const ACL_MATRIX = {
    STUDENT: {
      ASSIGNMENT: ['CREATE', 'READ'],
      GRADE: ['READ'],
      AUDIT_LOG: []
    },
    FACULTY: {
      ASSIGNMENT: ['READ', 'UPDATE'],
      GRADE: ['CREATE', 'READ', 'UPDATE'],
      AUDIT_LOG: ['READ']
    },
    ADMIN: {
      ASSIGNMENT: ['READ', 'DELETE'],
      GRADE: ['READ'],
      AUDIT_LOG: ['READ', 'DELETE']
    }
  };

  res.json({
    success: true,
    acl: ACL_MATRIX,
    message: 'Access Control List (NIST SP 800-63-2 compliant)'
  });
});

export default router;
