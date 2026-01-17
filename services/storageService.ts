
import { User, UserRole, ResourceType, Action, Assignment, AuditLog } from '../types';

/**
 * ACL Implementation (Requirement 2)
 * Matrix defining permissions for 3 subjects and 3 objects.
 */
const ACL_MATRIX: Record<UserRole, Partial<Record<ResourceType, Action[]>>> = {
  [UserRole.STUDENT]: {
    [ResourceType.ASSIGNMENT]: [Action.CREATE, Action.READ],
    [ResourceType.GRADE]: [Action.READ],
  },
  [UserRole.FACULTY]: {
    [ResourceType.ASSIGNMENT]: [Action.READ, Action.UPDATE],
    [ResourceType.GRADE]: [Action.CREATE, Action.READ, Action.UPDATE],
  },
  [UserRole.ADMIN]: {
    [ResourceType.ASSIGNMENT]: [Action.READ, Action.DELETE],
    [ResourceType.GRADE]: [Action.READ],
    [ResourceType.AUDIT_LOG]: [Action.READ, Action.AUDIT],
  }
};

export const checkPermission = (role: UserRole, resource: ResourceType, action: Action): boolean => {
  const permissions = ACL_MATRIX[role][resource];
  return permissions?.includes(action) || false;
};

// Mock Database Initial State
export const INITIAL_USERS: User[] = [
  { id: '1', username: 'admin', role: UserRole.ADMIN, passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', salt: 'salt1', mfaEnabled: true }, // pass: admin123
  { id: '2', username: 'faculty1', role: UserRole.FACULTY, passwordHash: 'hashed_fac', salt: 'salt2', mfaEnabled: true },
  { id: '3', username: 'student1', role: UserRole.STUDENT, passwordHash: 'hashed_stu', salt: 'salt3', mfaEnabled: true },
];

export const getAuditLogs = (): AuditLog[] => {
  const saved = localStorage.getItem('audit_logs');
  return saved ? JSON.parse(saved) : [];
};

export const saveAuditLog = (log: AuditLog) => {
  const logs = getAuditLogs();
  logs.unshift(log);
  localStorage.setItem('audit_logs', JSON.stringify(logs));
};
