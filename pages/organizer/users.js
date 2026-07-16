import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';

const ROLE_LABELS = {
  admin: 'Admin',
  organizer: 'Organizer',
  checkin_seva: 'Check-in Seva',
  registration_seva: 'Registration Seva',
  accounts: 'Accounts'
};

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
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
  const [resetUser, setResetUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    const u = localStorage.getItem('sy_user');
    if (!token) { router.push('/organizer/login'); return; }
    const parsed = JSON.parse(u || '{}');
    if (!['organizer', 'admin'].includes(parsed.role)) { router.push('/organizer/dashboard'); return; }
    
    setCurrentUser(parsed);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const r = await api.get('/users');
      setUsers(r.data);
    } catch {} finally { setLoading(false); }
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/organizer/dashboard" className="text-gray-400 hover:text-primary text-sm">← Back</Link>
          <span className="font-semibold text-gray-800 text-sm">👥 Users</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary !px-4 !py-2 text-sm">
          + Add
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                    {u.id === currentUser?.id && (
                      <span className="text-xs text-gray-400">(You)</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                  <p className="text-xs text-gray-400">{u.phone || '—'}</p>
                  <p className="text-xs text-gray-400">Joined {new Date(u.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => setEditingUser(u)}
                    className="text-xs text-primary hover:underline text-right">Edit Role</button>
                  <button onClick={() => setResetUser(u)}
                    className="text-xs text-amber-600 hover:underline text-right">Set Password</button>
                  {u.id !== currentUser?.id && (
                    <button onClick={() => deleteUser(u.id, u.name)}
                      className="text-xs text-red-400 hover:underline text-right">Remove</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); fetchUsers(); }} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={() => { setEditingUser(null); fetchUsers(); }} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
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
      setError(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Add User</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <div className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div><label className="label">Phone</label><input className="input" type="tel" maxLength={10} inputMode="numeric" value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g,'').slice(0,10)})} /></div>
          <div><label className="label">Password</label><input className="input" type="password" minLength={8} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min. 8 characters" /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="checkin_seva">Check-in Seva</option>
              <option value="registration_seva">Registration Seva</option>
              <option value="accounts">Accounts</option>
              <option value="admin">Admin</option>
              <option value="organizer">Organizer</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? '…' : 'Create'}</button>
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
      setError(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Edit User</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <div className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><label className="label">Phone</label><input className="input" type="tel" maxLength={10} value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g,'').slice(0,10)})} /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="checkin_seva">Check-in Seva</option>
              <option value="registration_seva">Registration Seva</option>
              <option value="accounts">Accounts</option>
              <option value="admin">Admin</option>
              <option value="organizer">Organizer</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? '…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    if (password.length < 8) { setError('Minimum 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setSaving(true); setError('');
    try {
      await api.patch(`/users/${user.id}/reset-password`, { new_password: password });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Set Password</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Setting new password for <strong>{user.name}</strong></p>
        {success ? (
          <p className="text-green-600 text-center py-4">✅ Password updated!</p>
        ) : (
          <div className="space-y-3">
            <div><label className="label">New Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" /></div>
            <div><label className="label">Confirm Password</label><input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} /></div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
              <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? '…' : 'Set Password'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}