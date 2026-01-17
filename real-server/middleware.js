import { verifyJWT } from './security.js';
import { AuditLog } from './models.js';

/**
 * ACL MATRIX - Authorization Policy (NIST Compliant)
 */
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

// Authenticate JWT Token
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
};

// Authorization Middleware
export const authorize = (resource, action) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const permissions = ACL_MATRIX[userRole]?.[resource] || [];
    
    if (!permissions.includes(action)) {
      logAuditEvent(req.user.userId, req.user.username, 'UNAUTHORIZED_ACCESS', resource, 
        `Unauthorized attempt to ${action} ${resource}`, req);
      
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        required: { resource, action },
        available: permissions
      });
    }
    
    next();
  };
};

// Audit Logging
export const logAuditEvent = async (userId, username, action, resource, details, req) => {
  try {
    const auditLog = new AuditLog({
      id: Math.random().toString(36).substr(2, 9),
      userId,
      username,
      action,
      resource,
      details,
      timestamp: new Date(),
      ipAddress: req?.ip || 'unknown',
      userAgent: req?.headers['user-agent'] || 'unknown'
    });
    
    await auditLog.save();
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

// Get ACL Matrix for documentation
export const getACLMatrix = () => ACL_MATRIX;
