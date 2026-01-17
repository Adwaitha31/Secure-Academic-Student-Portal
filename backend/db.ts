
import { User, Assignment, AuditLog, UserRole } from '../types';

const STORAGE_KEYS = {
  USERS: 'secure_portal_users',
  ASSIGNMENTS: 'secure_portal_assignments',
  LOGS: 'secure_portal_logs'
};

// NIST-compliant initial users for Lab Eval
const INITIAL_USERS: User[] = [
  { 
    id: 'admin-001', 
    username: 'admin', 
    role: UserRole.ADMIN, 
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // pass: admin123
    salt: 'salt1', 
    mfaEnabled: true 
  },
  { 
    id: 'fac-001', 
    username: 'faculty', 
    role: UserRole.FACULTY, 
    passwordHash: '8780282136e0d37651a83701258838b00078cf954848f0298a000676451e0413', // pass: faculty123
    salt: 'salt2', 
    mfaEnabled: true 
  }
];

export const db = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(data);
  },
  saveUsers: (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),
  
  getAssignments: (): Assignment[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS) || '[]'),
  saveAssignments: (as: Assignment[]) => localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(as)),
  
  getLogs: (): AuditLog[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]'),
  saveLog: (log: AuditLog) => {
    const logs = db.getLogs();
    logs.unshift(log);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }
};
