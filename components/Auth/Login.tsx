
import React, { useState } from 'react';
import { api } from '../../frontend/api';

const Login: React.FC<{ onLoginSuccess: (u: any) => void; onGoToRegister: () => void }> = ({ onLoginSuccess, onGoToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [loginData, setLoginData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.auth.login(username, password);
      
      if (response.mfaRequired) {
        // Show OTP input
        setLoginData(response);
        setShowOTP(true);
        setError('Check backend terminal for OTP code');
      } else {
        // Direct login (if MFA disabled)
        onLoginSuccess({ 
          id: response.userId,
          username: response.username,
          role: response.role,
          mfaEnabled: false
        });
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.auth.verifyOTP(loginData.userId, otp);
      
      // Login successful
      onLoginSuccess(response.user);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      {!showOTP ? (
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-2xl space-y-4">
          <h1 className="text-2xl font-bold text-center">Secure Sign In</h1>
          <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Username" />
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Password" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg">Login</button>
          <button type="button" onClick={onGoToRegister} className="w-full text-sm text-slate-500">New? Register here</button>
        </form>
      ) : (
        <form onSubmit={handleOTPSubmit} className="w-full max-w-md bg-white p-8 rounded-2xl space-y-4">
          <h1 className="text-2xl font-bold text-center">Enter OTP</h1>
          <p className="text-sm text-slate-600 text-center">Check the backend terminal for your 6-digit OTP code</p>
          <input 
            required 
            value={otp} 
            onChange={e => setOtp(e.target.value)} 
            className="w-full p-3 border rounded-lg text-center text-2xl tracking-widest" 
            placeholder="000000"
            maxLength={6}
            pattern="[0-9]{6}"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg">Verify OTP</button>
          <button type="button" onClick={() => { setShowOTP(false); setOtp(''); setError(''); }} className="w-full text-sm text-slate-500">Back to Login</button>
        </form>
      )}
    </div>
  );
};

export default Login;
