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
    <div className="max-w-2xl mx-auto mt-10 bg-white shadow-lg rounded-lg p-12">
      <h2 className="text-3xl font-bold mb-6 text-center">User Profile</h2>
      <div className="mb-8">
        <div className="flex items-center mb-3">
          <span className="font-semibold w-40">Name:</span>
          <span>{user?.name}</span>
        </div>
        <div className="flex items-center mb-3">
          <span className="font-semibold w-40">Email:</span>
          <span>{user?.email}</span>
        </div>
        <div className="flex items-center mb-3">
          <span className="font-semibold w-40">Role:</span>
          <span className="capitalize">{user?.role}</span>
        </div>
      </div>
      <hr className="mb-8" />
      <form onSubmit={handlePasswordChange} className="w-full">
        <h3 className="text-xl font-semibold mb-4">Change Password</h3>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Current Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">New Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-1 text-sm font-medium">Confirm New Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {message && (
          <div className={`mb-4 text-center ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
          disabled={loading}
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
