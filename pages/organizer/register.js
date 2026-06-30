import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'organizer' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await api.post('/auth/register', form);
      localStorage.setItem('sy_token', r.data.token);
      localStorage.setItem('sy_user', JSON.stringify(r.data.user));
      router.push('/organizer/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🪷</div>
          <h1 className="text-xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">For organizers & seva volunteers</p>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 9XXXXXXXXX" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required minLength={8} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min. 8 characters" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="organizer">Organizer (full access)</option>
              <option value="checkin_seva">Check-in Seva</option>
              <option value="registration_seva">Registration Seva</option>
              <option value="accounts">Accounts Team</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/organizer/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
