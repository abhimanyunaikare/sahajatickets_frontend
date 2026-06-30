import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await api.post('/auth/login', form);
      localStorage.setItem('sy_token', r.data.token);
      localStorage.setItem('sy_user', JSON.stringify(r.data.user));
      const next = router.query.next || '/organizer/dashboard';
      router.push(next);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🪷</div>
          <h1 className="text-2xl font-bold text-gray-900">SY Events</h1>
          <p className="text-gray-500 text-sm mt-1">Organizer / Seva Login</p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••" />
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* <p className="text-center text-sm text-gray-500 mt-6">
          New organizer?{' '}
          <Link href="/organizer/register" className="text-primary font-medium hover:underline">
            Create account
          </Link>
        </p> */}
      </div>
    </div>
  );
}
