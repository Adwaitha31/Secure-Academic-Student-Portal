import express from 'express';
import { User, Assignment, AuditLog, OTP, AssignmentTask, Submission, Announcement } from './models.js';
import {
  hashPassword,
  verifyPassword,
  generateOTP,
  encryptData,
  decryptData,
  safeDecrypt,
  generateSignature,
  generateJWT,
  generateSalt
} from './security.js';
import { authenticate, authorize, logAuditEvent } from './middleware.js';
import crypto from 'crypto';

const router = express.Router();

const MAX_LOGIN_ATTEMPTS = 3;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * AUTHENTICATION ROUTES
 */

// Register User
// NIST SP 800-63-2 Password Validation
const validatePasswordNIST = (password) => {
  const errors = [];
  if (!password || password.length < 12) errors.push('At least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least 1 lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least 1 number');
  if (!/[!@#$%^&*]/.test(password)) errors.push('At least 1 special character (!@#$%^&*)');
  return errors;
};

router.post('/auth/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    // Validation
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // NIST SP 800-63-2 Password Policy Validation
    const passwordErrors = validatePasswordNIST(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Password does not meet NIST SP 800-63-2 requirements',
        requirements: passwordErrors
      });
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

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 60000);
      await logAuditEvent(user.id, username, 'LOGIN_BLOCKED', 'AUTH', `Account locked. ${remainingTime} minutes remaining`, req);
      return res.status(423).json({ 
        error: `Account locked due to too many failed attempts. Try again in ${remainingTime} minutes.`,
        locked: true,
        lockedUntil: user.lockedUntil
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_TIME);
        await user.save();
        await logAuditEvent(user.id, username, 'ACCOUNT_LOCKED', 'AUTH', `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts`, req);
        return res.status(423).json({ 
          error: `Account locked due to ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in 15 minutes.`,
          locked: true
        });
      }
      
      await user.save();
      const attemptsRemaining = MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts;
      return res.status(401).json({ 
        error: `Invalid credentials. ${attemptsRemaining} attempts remaining before account lock.`
      });
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

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
    // DECRYPT grade and feedback when reading (safeDecrypt handles both old plain text and new encrypted data)
    const assignmentsWithDecrypted = assignments.map(a => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.studentName,
      filename: a.filename,
      contentType: a.contentType,
      isBinary: a.isBinary,
      submittedAt: a.submittedAt,
      grade: safeDecrypt(a.grade),
      gradedBy: a.gradedBy,
      feedback: safeDecrypt(a.feedback),
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

    console.log(`[DOWNLOAD] Attempting download for assignment: ${assignmentId}, role: ${role}`);

    if (role !== 'FACULTY' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to download content' });
    }

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) {
      console.log(`[DOWNLOAD] Assignment not found: ${assignmentId}`);
      return res.status(404).json({ error: 'Assignment not found' });
    }

    console.log(`[DOWNLOAD] Found assignment: ${assignment.filename}, isBinary: ${assignment.isBinary}, contentType: ${assignment.contentType}`);

    if (!assignment.encryptedContent) {
      console.log(`[DOWNLOAD] No content for assignment: ${assignmentId}`);
      return res.status(404).json({ error: 'No content found for this assignment' });
    }

    let decryptedContent;
    try {
      decryptedContent = decryptData(assignment.encryptedContent);
      console.log(`[DOWNLOAD] Decryption successful, content length: ${decryptedContent.length}`);
    } catch (decryptError) {
      console.error('[DOWNLOAD] Decryption failed:', decryptError.message);
      decryptedContent = assignment.encryptedContent;
    }

    const safeName = assignment.filename || 'submission.bin';
    const contentType = assignment.contentType || 'application/octet-stream';

    if (assignment.isBinary) {
      console.log(`[DOWNLOAD] Sending binary file: ${safeName}`);
      const buffer = Buffer.from(decryptedContent, 'base64');
      console.log(`[DOWNLOAD] Buffer size: ${buffer.length} bytes`);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    // Text content
    console.log(`[DOWNLOAD] Sending text file: ${safeName}`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.send(decryptedContent);
  } catch (error) {
    console.error('[DOWNLOAD] Error:', error);
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

    // Update assignment - ENCRYPT grade and feedback for security
    assignment.grade = encryptData(grade);
    assignment.gradedBy = username;
    assignment.feedback = feedback ? encryptData(feedback) : '';
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

/**
 * ASSIGNMENT TASK ROUTES (Faculty creates assignments)
 */

// Create Assignment Task (Faculty only)
router.post('/assignment-tasks', authenticate, async (req, res) => {
  try {
    const { title, description, deadline, maxMarks } = req.body;
    const { userId, username, role } = req.user;

    if (role !== 'FACULTY') {
      return res.status(403).json({ error: 'Only faculty can create assignments' });
    }

    if (!title || !deadline) {
      return res.status(400).json({ error: 'Title and deadline are required' });
    }

    const task = new AssignmentTask({
      id: crypto.randomUUID(),
      title,
      description: description || '',
      createdBy: userId,
      createdByName: username,
      deadline: new Date(deadline),
      maxMarks: maxMarks || 100,
      createdAt: new Date(),
      isActive: true
    });

    await task.save();

    await logAuditEvent(userId, username, 'CREATE_ASSIGNMENT_TASK', 'ASSIGNMENT', `Created assignment: ${title}`, req);

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      task
    });
  } catch (error) {
    console.error('Create assignment task error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Get All Assignment Tasks
router.get('/assignment-tasks', authenticate, async (req, res) => {
  try {
    const tasks = await AssignmentTask.find({ isActive: true }).sort({ deadline: 1 });
    
    // Add submission count for each task
    const tasksWithCounts = await Promise.all(tasks.map(async (task) => {
      const submissionCount = await Submission.countDocuments({ assignmentTaskId: task.id });
      return {
        ...task.toObject(),
        submissionCount
      };
    }));

    res.json({
      success: true,
      tasks: tasksWithCounts
    });
  } catch (error) {
    console.error('Get assignment tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Delete Assignment Task (Faculty only)
router.delete('/assignment-tasks/:taskId', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { role, userId, username } = req.user;

    if (role !== 'FACULTY' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await AssignmentTask.updateOne({ id: taskId }, { isActive: false });
    await logAuditEvent(userId, username, 'DELETE_ASSIGNMENT_TASK', 'ASSIGNMENT', `Deleted assignment: ${taskId}`, req);

    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    console.error('Delete assignment task error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

/**
 * SUBMISSION ROUTES (Students submit to assignment tasks)
 */

// Submit to Assignment Task
router.post('/submissions', authenticate, async (req, res) => {
  try {
    const { assignmentTaskId, filename, content, contentType, isBinary } = req.body;
    const { userId, username, role } = req.user;

    if (role !== 'STUDENT') {
      return res.status(403).json({ error: 'Only students can submit assignments' });
    }

    if (!assignmentTaskId || !filename || !content) {
      return res.status(400).json({ error: 'Assignment, filename and content are required' });
    }

    // Get assignment task
    const task = await AssignmentTask.findOne({ id: assignmentTaskId });
    if (!task) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({ assignmentTaskId, studentId: userId });
    if (existingSubmission) {
      return res.status(400).json({ error: 'You have already submitted this assignment' });
    }

    // Check if late
    const isLate = new Date() > new Date(task.deadline);

    // Encrypt content
    const encryptedContent = encryptData(content);
    const digitalSignature = generateSignature(content);

    const submission = new Submission({
      id: crypto.randomUUID(),
      assignmentTaskId,
      assignmentTaskTitle: task.title,
      studentId: userId,
      studentName: username,
      filename,
      contentType: contentType || 'application/octet-stream',
      isBinary: !!isBinary,
      encryptedContent,
      digitalSignature,
      isLate,
      submittedAt: new Date()
    });

    await submission.save();

    await logAuditEvent(userId, username, 'SUBMIT_ASSIGNMENT', 'SUBMISSION', 
      `Submitted ${filename} for ${task.title}${isLate ? ' (LATE)' : ''}`, req);

    res.status(201).json({
      success: true,
      message: isLate ? 'Assignment submitted (Late submission)' : 'Assignment submitted successfully',
      submission: {
        id: submission.id,
        filename: submission.filename,
        isLate: submission.isLate,
        submittedAt: submission.submittedAt
      }
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// Get Submissions (Students see theirs, Faculty sees all)
router.get('/submissions', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { assignmentTaskId } = req.query;

    let query = {};
    if (role === 'STUDENT') {
      query.studentId = userId;
    }
    if (assignmentTaskId) {
      query.assignmentTaskId = assignmentTaskId;
    }

    const submissions = await Submission.find(query).sort({ submittedAt: -1 });

    const submissionsWithDecrypted = submissions.map(s => ({
      id: s.id,
      assignmentTaskId: s.assignmentTaskId,
      assignmentTaskTitle: s.assignmentTaskTitle,
      studentId: s.studentId,
      studentName: s.studentName,
      filename: s.filename,
      contentType: s.contentType,
      isBinary: s.isBinary,
      isLate: s.isLate,
      submittedAt: s.submittedAt,
      grade: safeDecrypt(s.grade),
      gradedBy: s.gradedBy,
      feedback: safeDecrypt(s.feedback),
      gradedAt: s.gradedAt,
      digitalSignature: s.digitalSignature
    }));

    res.json({
      success: true,
      submissions: submissionsWithDecrypted
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Download Submission (Faculty only)
router.get('/submissions/:submissionId/download', authenticate, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { role } = req.user;

    if (role !== 'FACULTY' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const submission = await Submission.findOne({ id: submissionId });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    let decryptedContent;
    try {
      decryptedContent = decryptData(submission.encryptedContent);
    } catch (e) {
      decryptedContent = submission.encryptedContent;
    }

    const safeName = submission.filename || 'submission.bin';
    const contentType = submission.contentType || 'application/octet-stream';

    if (submission.isBinary) {
      const buffer = Buffer.from(decryptedContent, 'base64');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      return res.send(buffer);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.send(decryptedContent);
  } catch (error) {
    console.error('Download submission error:', error);
    res.status(500).json({ error: 'Failed to download' });
  }
});

// Grade Submission (Faculty only)
router.post('/submissions/:submissionId/grade', authenticate, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const { userId, username, role } = req.user;

    if (role !== 'FACULTY') {
      return res.status(403).json({ error: 'Only faculty can grade submissions' });
    }

    if (!grade) {
      return res.status(400).json({ error: 'Grade is required' });
    }

    const submission = await Submission.findOne({ id: submissionId });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Encrypt grade and feedback
    submission.grade = encryptData(grade);
    submission.feedback = feedback ? encryptData(feedback) : '';
    submission.gradedBy = username;
    submission.gradedAt = new Date();

    await submission.save();

    await logAuditEvent(userId, username, 'GRADE_SUBMISSION', 'GRADE', 
      `Graded ${submission.studentName}'s submission with ${grade}`, req);

    res.json({
      success: true,
      message: 'Submission graded successfully'
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

/**
 * ANNOUNCEMENT ROUTES
 */

// Create Announcement (Faculty only)
router.post('/announcements', authenticate, async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    const { userId, username, role } = req.user;

    if (role !== 'FACULTY' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only faculty can post announcements' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcement = new Announcement({
      id: crypto.randomUUID(),
      title,
      content,
      postedBy: userId,
      postedByName: username,
      priority: priority || 'MEDIUM',
      createdAt: new Date(),
      isActive: true
    });

    await announcement.save();

    await logAuditEvent(userId, username, 'CREATE_ANNOUNCEMENT', 'ANNOUNCEMENT', `Posted: ${title}`, req);

    res.status(201).json({
      success: true,
      message: 'Announcement posted successfully',
      announcement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to post announcement' });
  }
});

// Get Announcements
router.get('/announcements', authenticate, async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Delete Announcement
router.delete('/announcements/:announcementId', authenticate, async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { role, userId, username } = req.user;

    if (role !== 'FACULTY' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Announcement.updateOne({ id: announcementId }, { isActive: false });
    await logAuditEvent(userId, username, 'DELETE_ANNOUNCEMENT', 'ANNOUNCEMENT', `Deleted: ${announcementId}`, req);

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

/**
 * PROFILE ROUTES
 */

// Get Profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        mfaEnabled: user.mfaEnabled
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update Profile (Change Password)
router.put('/profile/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { userId, username } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const { hash: newHash, salt: newSalt } = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.salt = newSalt;
    user.updatedAt = new Date();

    await user.save();

    await logAuditEvent(userId, username, 'CHANGE_PASSWORD', 'PROFILE', 'Password changed successfully', req);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
