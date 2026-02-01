
import { User, UserRole } from '../types';

/**
 * REAL BACKEND API CLIENT
 * Connects to Express.js backend running on localhost:5000
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Get JWT token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// API request wrapper
const apiRequest = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
) => {
  const headers: any = {
    'Content-Type': 'application/json'
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
};

export const api = {
  /**
   * AUTHENTICATION ENDPOINTS
   */
  auth: {
    register: async (username: string, password: string, role: UserRole, email?: string) => {
      const result = await apiRequest('/auth/register', 'POST', {
        username,
        password,
        role,
        email
      });
      return result;
    },

    login: async (username: string, password: string) => {
      const result = await apiRequest('/auth/login', 'POST', {
        username,
        password
      });
      return result;
    },

    verifyOTP: async (userId: string, otpCode: string) => {
      const result = await apiRequest('/auth/verify-otp', 'POST', {
        userId,
        otpCode
      });
      
      // Store token in localStorage
      if (result.token) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
      }
      
      return result;
    },

    logout: () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }
  },

  /**
   * ASSIGNMENT ENDPOINTS
   */
  assignments: {
    submit: async (filename: string, content: string, options?: { contentType?: string; isBinary?: boolean }) => {
      return apiRequest('/assignments/submit', 'POST', {
        filename,
        content,
        contentType: options?.contentType,
        isBinary: options?.isBinary ?? false
      });
    },

    getAll: async () => {
      return apiRequest('/assignments', 'GET');
    },

    grade: async (assignmentId: string, grade: string, feedback?: string) => {
      return apiRequest(`/assignments/${assignmentId}/grade`, 'POST', {
        grade,
        feedback
      });
    },

    decrypt: async (assignmentId: string) => {
      return apiRequest(`/assignments/${assignmentId}/decrypt`, 'GET');
    },

    download: async (assignmentId: string) => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/download`, {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        let errorMessage = `Download failed: ${res.status}`;
        try {
          const error = await res.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1] : 'submission';
      return { blob, filename };
    }
  },

  /**
   * DASHBOARD ENDPOINTS
   */
  dashboard: {
    getStudent: async () => {
      return apiRequest('/dashboard/student', 'GET');
    },

    getFaculty: async () => {
      return apiRequest('/dashboard/faculty', 'GET');
    },

    getAdmin: async () => {
      return apiRequest('/dashboard/admin', 'GET');
    }
  },

  /**
   * AUDIT LOG ENDPOINTS
   */
  logs: {
    getAll: async () => {
      return apiRequest('/logs', 'GET');
    }
  },

  /**
   * SYSTEM ENDPOINTS
   */
  system: {
    getACL: async () => {
      return apiRequest('/system/acl', 'GET');
    }
  }
};
