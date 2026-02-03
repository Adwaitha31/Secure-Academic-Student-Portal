
import React, { useState } from 'react';
import { UserRole } from '../../types';
import { api } from '../../frontend/api';

// NIST SP 800-63-2 Password Validation
const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  if (password.length < 12) errors.push('At least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least 1 lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least 1 number');
  if (!/[!@#$%^&*]/.test(password)) errors.push('At least 1 special character (!@#$%^&*)');
  return errors;
};

const Register: React.FC<{ onRegisterSuccess: () => void; onGoToLogin: () => void }> = ({ onRegisterSuccess, onGoToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(UserRole.STUDENT);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password before sending
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError('Password requirements: ' + passwordErrors.join(', '));
      return;
    }

    try {
      await api.auth.register(username, password, role);
      onRegisterSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const passwordErrors = password ? validatePassword(password) : [];
  const isPasswordValid = password && passwordErrors.length === 0;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <form onSubmit={handleRegister} className="w-full max-w-md bg-white p-8 rounded-2xl space-y-4">
        <h1 className="text-2xl font-bold text-center">Enroll Securely</h1>
        <p className="text-xs text-center text-slate-500">NIST SP 800-63-2 Compliant</p>
        
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        
        <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Username" />
        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-3 border rounded-lg">
          <option value={UserRole.STUDENT}>Student</option>
          <option value={UserRole.FACULTY}>Faculty</option>
          <option value={UserRole.ADMIN}>Admin</option>
        </select>
        
        <div>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={`w-full p-3 border rounded-lg ${password && (isPasswordValid ? 'border-green-500' : 'border-amber-500')}`} placeholder="Password" />
          {password && (
            <div className="mt-2 text-xs">
              {isPasswordValid ? (
                <span className="text-green-600">✓ Password meets NIST requirements</span>
              ) : (
                <span className="text-amber-600">Required: {passwordErrors.join(', ')}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600">
          <p className="font-medium mb-1">Password Requirements (NIST SP 800-63-2):</p>
          <ul className="space-y-0.5">
            <li className={password?.length >= 12 ? 'text-green-600' : ''}>• Minimum 12 characters</li>
            <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>• At least 1 uppercase (A-Z)</li>
            <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>• At least 1 lowercase (a-z)</li>
            <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>• At least 1 number (0-9)</li>
            <li className={/[!@#$%^&*]/.test(password) ? 'text-green-600' : ''}>• At least 1 special (!@#$%^&*)</li>
          </ul>
        </div>
        
        <button type="submit" disabled={!isPasswordValid} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Create Account</button>
        <button type="button" onClick={onGoToLogin} className="w-full text-sm text-slate-500">Already have an account? Sign In</button>
      </form>
    </div>
  );
};

export default Register;
