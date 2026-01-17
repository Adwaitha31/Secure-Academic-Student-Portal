
export enum UserRole {
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  ADMIN = 'ADMIN'
}

export enum ResourceType {
  ASSIGNMENT = 'ASSIGNMENT',
  GRADE = 'GRADE',
  AUDIT_LOG = 'AUDIT_LOG'
}

export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  AUDIT = 'AUDIT'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
}

export interface Assignment {
  id: string;
  studentId: string;
  studentName: string;
  filename: string;
  encryptedContent?: string;
  digitalSignature: string;
  contentType?: string;
  isBinary?: boolean;
  grade?: string;
  gradedBy?: string;
  feedback?: string;
  gradedAt?: string | number | Date;
  submittedAt?: string | number | Date;
  timestamp?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  timestamp: number;
  details: string;
}

export interface AppState {
  currentUser: User | null;
  mfaPending: User | null;
  assignments: Assignment[];
  logs: AuditLog[];
}
