import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';

export default function ChangePassword() {
  const router = useRouter();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setError('');
    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match'); return;
    }
    if (form.new_password.length < 8) {
      setError('Password must be at least 8 characters'); return;
    }
    setLoading(true);
    try {
      await api.patch('/users/change-password', {
        current_password: form.current_password,
        new_password: form.new_password
      });
      setSuccess(true);
      setTimeout(() => router.push('/organizer/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="mb-6">
          <Link href="/organizer/dashboard" className="text-gray-400 hover:text-primary text-sm">← Dashboard</Link>
          <h1 className="text-xl font-bold text-gray-800 mt-3">Change Password</h1>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-600 font-medium">Password changed successfully!</p>
            <p className="text-gray-400 text-sm mt-1">Redirecting to dashboard…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input className="input" type="password" placeholder="Your current password"
                value={form.current_password}
                onChange={e => setForm({ ...form, current_password: e.target.value })} />
            </div>
            <div>
              <label className="label">New Password</label>
              <input className="input" type="password" placeholder="Min. 8 characters"
                value={form.new_password}
                onChange={e => setForm({ ...form, new_password: e.target.value })} />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input className="input" type="password" placeholder="Repeat new password"
                value={form.confirm_password}
                onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <button onClick={submit} disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}