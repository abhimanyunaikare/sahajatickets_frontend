import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';

const ROLE_LABELS = {
  organizer: 'Organizer (full access)',
  checkin_seva: 'Check-in Seva',
  registration_seva: 'Registration Seva',
  accounts: 'Accounts Team'
};

const ROLE_COLORS = {
  organizer: 'bg-purple-100 text-primary',
  checkin_seva: 'bg-green-100 text-green-700',
  registration_seva: 'bg-blue-100 text-blue-700',
  accounts: 'bg-amber-100 text-amber-700'
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    const u = localStorage.getItem('sy_user');
    if (!token) { router.push('/organizer/login'); return; }
    const parsed = JSON.parse(u);
    if (parsed.role !== 'organizer') { router.push('/organizer/dashboard'); return; }
    setCurrentUser(parsed);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const r = await api.get('/users');
      setUsers(r.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Remove ${name}'s account? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/organizer/dashboard" className="text-gray-400 hover:text-primary text-sm">← Dashboard</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">👥 Users & Seva Team</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary !px-4 !py-2 text-sm">
          + Add User
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500 mb-5">
          Manage organizer, accounts, check-in seva, and registration seva accounts. New organizer accounts can only be created here.
        </p>

        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-purple-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.name}</div>
                    {u.id === currentUser?.id && <span className="text-xs text-gray-400">(You)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-600 text-xs">{u.email}</div>
                    <div className="text-gray-400 text-xs">{u.phone || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setEditingUser(u)} className="text-xs text-primary hover:underline">Edit</button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => deleteUser(u.id, u.name)} className="text-xs text-red-500 hover:underline">Remove</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); fetchUsers(); }} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={() => { setEditingUser(null); fetchUsers(); }} />}
    </div>
  );
}

function AddUserModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'checkin_seva' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/users', form);
      onAdded();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-800">Add New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div><label className="label">Phone</label><input className="input" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><label className="label">Password</label><input className="input" type="password" minLength={8} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min. 8 characters" /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="checkin_seva">Check-in Seva</option>
              <option value="registration_seva">Registration Seva</option>
              <option value="accounts">Accounts Team</option>
              <option value="organizer">Organizer (full access)</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', role: user.role });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true); setError('');
    try {
      await api.patch(`/users/${user.id}`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-800">Edit User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><label className="label">Phone</label><input className="input" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="checkin_seva">Check-in Seva</option>
              <option value="registration_seva">Registration Seva</option>
              <option value="accounts">Accounts Team</option>
              <option value="organizer">Organizer (full access)</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">Email cannot be changed. Password resets require database access for now.</p>
        </div>
        {error && <p className="text-red-500 text-sm mt-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}