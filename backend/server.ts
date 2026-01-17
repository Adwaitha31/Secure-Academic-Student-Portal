
import { User, Assignment, AuditLog, UserRole, ResourceType, Action } from '../types';
import { db } from './db';
import { authorize } from './middleware';
import { hashPassword, generateSalt, encryptData, generateSignature } from './security';

/**
 * MOCK SERVER API
 * Mimics actual backend endpoints. Enforces security and logging.
 */
export const backendServer = {
  async register(username: string, password: string, role: UserRole) {
    const users = db.getUsers();
    if (users.find(u => u.username === username)) throw new Error("User exists");
    
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      role,
      passwordHash,
      salt,
      mfaEnabled: true
    };
    
    users.push(newUser);
    db.saveUsers(users);
    
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: newUser.id,
      username: newUser.username,
      action: 'REGISTER',
      resource: 'AUTH',
      timestamp: Date.now(),
      details: `New account created with role ${role}`
    });
    
    return { success: true };
  },

  async login(username: string, password: string) {
    const users = db.getUsers();
    const user = users.find(u => u.username === username);
    if (!user) throw new Error("Invalid credentials");
    
    const hashed = await hashPassword(password, user.salt);
    if (hashed !== user.passwordHash) throw new Error("Invalid credentials");
    
    return { user, mfaRequired: user.mfaEnabled };
  },

  async submitAssignment(user: User, filename: string, content: string) {
    if (!authorize(user.role, ResourceType.ASSIGNMENT, Action.CREATE)) throw new Error("Unauthorized");
    
    const encrypted = encryptData(content);
    const signature = await generateSignature(content);
    
    const assignment: Assignment = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: user.id,
      studentName: user.username,
      filename,
      encryptedContent: encrypted,
      digitalSignature: signature,
      timestamp: Date.now()
    };
    
    const assignments = db.getAssignments();
    assignments.unshift(assignment);
    db.saveAssignments(assignments);
    
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      username: user.username,
      action: 'UPLOAD_ENCRYPTED',
      resource: 'ASSIGNMENT',
      timestamp: Date.now(),
      details: `File ${filename} encrypted and signed`
    });
    
    return assignment;
  },

  async gradeAssignment(user: User, assignmentId: string, grade: string) {
    if (!authorize(user.role, ResourceType.GRADE, Action.CREATE)) throw new Error("Unauthorized");
    
    const assignments = db.getAssignments();
    const updated = assignments.map(a => 
      a.id === assignmentId ? { ...a, grade, gradedBy: user.username } : a
    );
    db.saveAssignments(updated);
    
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      username: user.username,
      action: 'SUBMIT_GRADE',
      resource: 'GRADE',
      timestamp: Date.now(),
      details: `Assignment ${assignmentId} graded: ${grade}`
    });
    
    return updated;
  },

  async getAuditLogs(user: User) {
    if (!authorize(user.role, ResourceType.AUDIT_LOG, Action.READ)) throw new Error("Unauthorized");
    return db.getLogs();
  }
};
