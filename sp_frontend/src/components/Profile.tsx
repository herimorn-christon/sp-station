import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';

export default function Profile() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(false);
    };
    fetchData();
  }, [user?.id]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await api.post(
        '/users/change-password',
        { currentPassword, newPassword },
        token
      );
      setMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Failed to change password.');
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 sm:mt-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-form-lg rounded-form p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-secondary-800 mb-2">User Profile</h2>
          <p className="text-sm sm:text-base text-secondary-600">Manage your account information</p>
        </div>

        <div className="bg-secondary-50 rounded-form p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold text-secondary-800 mb-4 sm:mb-6">Account Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-medium text-secondary-600 mb-1">Full Name</span>
              <span className="text-sm sm:text-base text-secondary-900 break-words">{user?.name}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-medium text-secondary-600 mb-1">Email Address</span>
              <span className="text-sm sm:text-base text-secondary-900 break-words">{user?.email}</span>
            </div>
            <div className="flex flex-col sm:col-span-2">
              <span className="text-xs sm:text-sm font-medium text-secondary-600 mb-2">Role</span>
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-primary-100 text-primary-800 w-fit capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="bg-white border border-secondary-200 rounded-form p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-secondary-800 mb-4 sm:mb-6">Change Password</h3>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">
                Current Password
              </label>
              <input
                type="password"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">
                New Password
              </label>
              <input
                type="password"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
              />
            </div>
          </div>

          {message && (
            <div className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-form text-center text-sm sm:text-base ${message.includes('success') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message}
            </div>
          )}

          <div className="mt-6 sm:mt-8">
            <button
              type="submit"
              className="w-full bg-primary-600 text-white py-2.5 sm:py-3 px-4 rounded-form hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-form font-semibold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              disabled={loading}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
