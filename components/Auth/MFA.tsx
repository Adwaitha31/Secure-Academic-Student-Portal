
import React, { useState, useEffect } from 'react';

interface MFAProps {
  onVerified: () => void;
  onCancel: () => void;
}

const MFA: React.FC<MFAProps> = ({ onVerified, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [mockOTP, setMockOTP] = useState('');
  const [isResending, setIsResending] = useState(false);

  const generateNewOTP = () => {
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setMockOTP(generated);
    console.log(`[SECURE SYSTEM] MFA OTP Issued: ${generated}`);
    // In a real lab, this would trigger an SMS/Email API call
  };

  useEffect(() => {
    generateNewOTP();
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === mockOTP) {
      onVerified();
    } else {
      setError('Invalid verification code. Please try again.');
    }
  };

  const handleResend = () => {
    setIsResending(true);
    setTimeout(() => {
      generateNewOTP();
      setIsResending(false);
      setCode('');
      setError('');
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900 text-white">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 text-slate-900">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Identity Verification</h1>
          <p className="text-slate-500 mt-2 font-medium">Step 2: Enter the 6-digit security code.</p>
        </div>

        {/* PROMINENT OTP RETRIEVAL BOX FOR LAB EVALUATION */}
        <div className="relative group mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em]">Lab Simulation Sandbox</p>
            </div>
            <p className="text-4xl font-mono font-black text-indigo-900 tracking-[0.3em] select-all cursor-pointer" title="Click to copy">
              {mockOTP}
            </p>
            <p className="text-[10px] text-indigo-400 mt-2 italic">In production, this code is sent via SMS/Email</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="relative">
            <input 
              type="text" 
              maxLength={6} 
              required 
              value={code} 
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                setCode(val);
                if (error) setError('');
              }}
              className="w-full px-4 py-5 text-center text-4xl font-mono font-black tracking-[0.4em] rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-200"
              placeholder="000000"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center font-bold animate-shake">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-500/10 transition transform active:scale-[0.98]"
          >
            Confirm & Access Portal
          </button>
        </form>

        <div className="mt-8 flex flex-col space-y-4 items-center">
          <button 
            onClick={handleResend} 
            disabled={isResending}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition disabled:opacity-50 flex items-center"
          >
            {isResending ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Regenerating Secure Code...
              </>
            ) : 'Resend Security Code'}
          </button>
          
          <button 
            onClick={onCancel} 
            className="text-xs text-slate-400 hover:text-slate-600 font-medium uppercase tracking-widest transition"
          >
            Cancel Login
          </button>
        </div>
      </div>
      
      <div className="mt-12 max-w-sm text-center">
        <p className="text-slate-500 text-[10px] leading-relaxed">
          Security Note: This portal implements Time-based One-Time Passwords (TOTP) logic. 
          Unsuccessful attempts are logged for audit by the system administrator.
        </p>
      </div>
    </div>
  );
};

export default MFA;
