
import React, { useState } from 'react';
import { UserRole } from '../../types';
import { api } from '../../frontend/api';

const Register: React.FC<{ onRegisterSuccess: () => void; onGoToLogin: () => void }> = ({ onRegisterSuccess, onGoToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(UserRole.STUDENT);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.auth.register(username, password, role);
    onRegisterSuccess();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <form onSubmit={handleRegister} className="w-full max-w-md bg-white p-8 rounded-2xl space-y-4">
        <h1 className="text-2xl font-bold text-center">Enroll Securely</h1>
        <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Username" />
        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-3 border rounded-lg">
          <option value={UserRole.STUDENT}>Student</option>
          <option value={UserRole.FACULTY}>Faculty</option>
          <option value={UserRole.ADMIN}>Admin</option>
        </select>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Password" />
        <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg">Create Account</button>
        <button onClick={onGoToLogin} className="w-full text-sm text-slate-500">Already have an account? Sign In</button>
      </form>
    </div>
  );
};

export default Register;
