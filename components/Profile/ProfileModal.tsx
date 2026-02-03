
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../frontend/api';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.profile.get();
      setProfile(res.profile);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 12) errors.push('At least 12 characters');
    if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('At least 1 lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('At least 1 number');
    if (!/[!@#$%^&*]/.test(password)) errors.push('At least 1 special character (!@#$%^&*)');
    return errors;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validate new password
    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setPasswordError('Password requirements: ' + validationErrors.join(', '));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChanging(true);
    try {
      await api.profile.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setChanging(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleString();

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-700',
      FACULTY: 'bg-purple-100 text-purple-700',
      STUDENT: 'bg-blue-100 text-blue-700'
    };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[role] || 'bg-gray-100'}`}>{role}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">My Profile</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : (
          <div className="p-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold">{user.username}</h3>
                {getRoleBadge(user.role)}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${activeTab === 'info' ? 'bg-white shadow' : 'text-slate-600'}`}
              >
                Profile Info
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${activeTab === 'password' ? 'bg-white shadow' : 'text-slate-600'}`}
              >
                Change Password
              </button>
            </div>

            {/* Profile Info Tab */}
            {activeTab === 'info' && profile && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Username</label>
                  <p className="font-medium">{profile.username}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Role</label>
                  <p className="font-medium">{profile.role}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Account Created</label>
                  <p className="font-medium">{formatDate(profile.createdAt)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="text-xs text-slate-500 uppercase tracking-wide">MFA Enabled</label>
                  <p className="font-medium flex items-center gap-2">
                    {profile.mfaEnabled ? (
                      <><span className="text-green-600">✓</span> Yes - Your account is protected with MFA</>
                    ) : (
                      <><span className="text-amber-600">!</span> No - Consider enabling MFA for better security</>
                    )}
                  </p>
                </div>
                {profile.lastLogin && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <label className="text-xs text-slate-500 uppercase tracking-wide">Last Login</label>
                    <p className="font-medium">{formatDate(profile.lastLogin)}</p>
                  </div>
                )}

                {/* Security Info */}
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h4 className="font-bold text-indigo-800 mb-2">🔐 Security Features</h4>
                  <ul className="text-sm text-indigo-700 space-y-1">
                    <li>• Password hashed with bcrypt (12 rounds)</li>
                    <li>• AES-256-CBC encryption for sensitive data</li>
                    <li>• HMAC-SHA256 digital signatures</li>
                    <li>• JWT token authentication</li>
                    <li>• Account locks after 3 failed attempts</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Change Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
                    {passwordSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter new password"
                  />
                  {newPassword && (
                    <div className="mt-2 text-xs">
                      {validatePassword(newPassword).length === 0 ? (
                        <span className="text-green-600">✓ Password meets requirements</span>
                      ) : (
                        <span className="text-amber-600">
                          Required: {validatePassword(newPassword).join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Confirm new password"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changing}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {changing ? 'Changing...' : 'Change Password'}
                  </button>
                </div>

                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Password Requirements (NIST SP 800-63-2)</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>• Minimum 12 characters</li>
                    <li>• At least 1 uppercase letter (A-Z)</li>
                    <li>• At least 1 lowercase letter (a-z)</li>
                    <li>• At least 1 number (0-9)</li>
                    <li>• At least 1 special character (!@#$%^&*)</li>
                  </ul>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
