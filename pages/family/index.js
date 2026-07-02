import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { seekerApi, getSeekerToken, getSeekerAccount } from '../../lib/api';
import ZonePicker from '../../components/ZonePicker';

const RELATIONS = ['Self', 'Spouse', 'Son', 'Daughter', 'Parent', 'Sibling', 'Other'];
const EMPTY = { name: '', age: '', date_of_birth: '', sex: 'male', relation: 'Self', zone_city: '', email: '', phone: '', volunteer_interests: [] };

function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getCategory(age) {
  if (!age && age !== 0) return null;
  if (age <= 12) return { label: 'Child', color: 'badge-child' };
  if (age <= 25) return { label: 'Yuva', color: 'badge-yuva' };
  return { label: 'Adult', color: 'badge-adult' };
}

export default function FamilyPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (!getSeekerToken()) { router.push('/login'); return; }
    setAccount(getSeekerAccount());
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const r = await seekerApi.get('/family');
      setMembers(r.data);
    } catch (err) {
      if (err.response?.status === 401) router.push('/login');
    } finally { setLoading(false); }
  };

  const deleteMember = async (id, name) => {
    if (!confirm(`Remove ${name} from your family list?`)) return;
    try {
      await seekerApi.delete(`/family/${id}`);
      fetchMembers();
    } catch { alert('Failed to remove member'); }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      <SeekerNav account={account} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">👨‍👩‍👧‍👦 Family Members</h1>
            <p className="text-sm text-gray-500 mt-0.5">Saved for quick ticket booking</p>
          </div>
          <button onClick={() => { setEditingMember(null); setShowForm(true); }}
            className="btn-primary !px-4 !py-2 text-sm">
            + Add Member
          </button>
        </div>

        {members.length === 0 && !showForm && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-3">👨‍👩‍👧</div>
            <p className="text-gray-500 mb-4">No family members added yet</p>
            <p className="text-gray-400 text-sm mb-5">Add members to quickly select them when booking tickets</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">Add First Member</button>
          </div>
        )}

        <div className="space-y-3 mb-5">
          {members.map(m => (
            <div key={m.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                  ${m.sex === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">
                    {m.relation} · Age {m.current_age || m.age}
                    {m.current_age && <span className="text-purple-400 ml-1">({m.current_age <= 12 ? 'Child' : m.current_age <= 25 ? 'Yuva' : 'Adult'})</span>}
                    · {m.sex === 'male' ? '♂' : '♀'}
                    {m.zone_city ? ` · ${m.zone_city}` : ''}
                  </p>
                  {m.volunteer_interests?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.volunteer_interests.map(i => (
                        <span key={i} className="text-xs bg-purple-100 text-primary px-2 py-0.5 rounded-full">{i}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingMember(m); setShowForm(true); }}
                  className="text-xs text-primary hover:underline px-2 py-1">Edit</button>
                <button onClick={() => deleteMember(m.id, m.name)}
                  className="text-xs text-red-500 hover:underline px-2 py-1">Remove</button>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <MemberForm
            initial={editingMember || EMPTY}
            onSave={async (data) => {
              try {
                if (editingMember) {
                  await seekerApi.patch(`/family/${editingMember.id}`, data);
                } else {
                  await seekerApi.post('/family', data);
                }
                setShowForm(false);
                setEditingMember(null);
                fetchMembers();
              } catch (err) {
                alert(err.response?.data?.error || 'Failed to save');
              }
            }}
            onCancel={() => { setShowForm(false); setEditingMember(null); }}
          />
        )}
      </div>
    </div>
  );
}

function MemberForm({ initial, onSave, onCancel }) {
    const [form, setForm] = useState({
      ...initial,
      date_of_birth: initial.date_of_birth ? initial.date_of_birth.split('T')[0] : '',
      volunteer_interests: initial.volunteer_interests || []
    });
    const [saving, setSaving] = useState(false);
    const [volunteerOptions, setVolunteerOptions] = useState([]);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
    useEffect(() => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/volunteer-options`)
        .then(r => r.json()).then(setVolunteerOptions).catch(() => {});
    }, []);
  
    const toggleInterest = (label) => {
      setForm(f => ({
        ...f,
        volunteer_interests: f.volunteer_interests.includes(label)
          ? f.volunteer_interests.filter(i => i !== label)
          : [...f.volunteer_interests, label]
      }));
    };
  
    const age = calculateAge(form.date_of_birth);
    const category = getCategory(age);
  
    const save = async () => {
      if (!form.name.trim()) { alert('Name required'); return; }
      if (!form.date_of_birth) { alert('Date of birth required'); return; }
      setSaving(true);
      await onSave({ ...form, age: age || parseInt(form.age) });
      setSaving(false);
    };
  
    return (
      <div className="card border-2 border-purple-200">
        <h3 className="font-semibold text-gray-700 mb-4">
          {initial.id ? 'Edit Member' : 'Add Family Member'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="Full name" />
          </div>
  
          {/* Date of Birth */}
          <div>
            <label className="label">Date of Birth *</label>
            <input className="input" type="date"
              max={new Date().toISOString().split('T')[0]}
              value={form.date_of_birth}
              onChange={e => set('date_of_birth', e.target.value)} />
            {age !== null && category && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className={category.color}>{category.label}</span>
                <span className="text-xs text-gray-500">Age {age} · auto-updates each year</span>
              </div>
            )}
          </div>
  
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Relation</label>
              <select className="input" value={form.relation}
                onChange={e => set('relation', e.target.value)}>
                {RELATIONS.map(r => (
                  <option key={r} value={r.toLowerCase()}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sex *</label>
              <div className="flex gap-2 mt-1">
                {['male', 'female'].map(s => (
                  <button key={s} type="button" onClick={() => set('sex', s)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                      ${form.sex === s
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-300 text-gray-600'}`}>
                    {s === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>
          </div>
  
          <div>
            <label className="label">City / Zone</label>
            <ZonePicker value={form.zone_city} onChange={v => set('zone_city', v)} />
        </div>
  
          <div>
            <label className="label">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="input" type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="10-digit number" />
          </div>
  
          <div>
            <label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="input" type="email" value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="email@example.com" />
          </div>
  
          {/* Volunteer Interests */}
          {volunteerOptions.length > 0 && (
            <div>
              <label className="label">Seva Interests <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {volunteerOptions.map(opt => {
                  const selected = form.volunteer_interests?.includes(opt.label);
                  return (
                    <button key={opt.id} type="button"
                      onClick={() => toggleInterest(opt.label)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                        ${selected
                          ? 'bg-primary text-white border-primary'
                          : 'border-gray-200 text-gray-600 hover:border-primary'}`}>
                      {selected ? '✓ ' : ''}{opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
  
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="btn-outline flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save Member'}
          </button>
        </div>
      </div>
    );
  }

export function SeekerNav({ account }) {
  const router = useRouter();
  const logout = () => {
    localStorage.removeItem('seeker_token');
    localStorage.removeItem('seeker_account');
    router.push('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🪷</span>
          <span className="font-bold text-primary text-lg">SY Events</span>
        </Link>
        <div className="flex items-center gap-3">
        <Link href="/my-tickets" className="text-sm text-gray-500 hover:text-primary">🎟 My Tickets</Link>
          <Link href="/family" className="text-sm text-gray-500 hover:text-primary">👨‍👩‍👧 Family</Link>
          <Link href="/profile" className="text-sm text-gray-500 hover:text-primary">👤 Profile</Link>

          {account && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 hidden sm:block">{account.name || account.phone}</span>
              <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-700">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function LoadingScreen() {
  return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
}