import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { seekerApi, getSeekerToken, getSeekerAccount, setSeekerSession, getSeekerToken as getToken } from '../../lib/api';
import { SeekerNav } from '../family';
import ZonePicker from '../../components/ZonePicker';
import ProfessionPicker from '../../components/ProfessionPicker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  if (!age) return null;
  if (age <= 12) return { label: 'Child', color: 'badge-child' };
  if (age <= 25) return { label: 'Yuva', color: 'badge-yuva' };
  return { label: 'Adult', color: 'badge-adult' };
}

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', date_of_birth: '',
    sex: 'male', zone_city: '', profession: '',
    volunteer_interests: []
  });
  const [stats, setStats] = useState(null);
  const [volunteerOptions, setVolunteerOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (!getSeekerToken()) { router.push('/login'); return; }
    const acct = getSeekerAccount();
    setAccount(acct);
    fetchProfile();
    fetchStats();
    fetchVolunteerOptions();
  }, []);

  const fetchProfile = async () => {
    try {
      const r = await seekerApi.get('/seeker-auth/profile');
      setForm({
        name: r.data.name || '',
        email: r.data.email || '',
        date_of_birth: r.data.date_of_birth ? r.data.date_of_birth.split('T')[0] : '',
        sex: r.data.sex || 'male',
        zone_city: r.data.zone_city || '',
        profession: r.data.profession || '',
        volunteer_interests: r.data.volunteer_interests || []
      });
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const r = await seekerApi.get('/seeker-auth/my-stats');
      setStats(r.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchVolunteerOptions = async () => {
    try {
      const r = await fetch(`${API_URL}/volunteer-options`);
      const data = await r.json();
      setVolunteerOptions(data);
    } catch {}
  };

  const toggleInterest = (label) => {
    setForm(f => ({
      ...f,
      volunteer_interests: f.volunteer_interests.includes(label)
        ? f.volunteer_interests.filter(i => i !== label)
        : [...f.volunteer_interests, label]
    }));
  };

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError(''); setSuccess(false);
    try {
      const r = await seekerApi.patch('/seeker-auth/profile', form);
      setSeekerSession(getSeekerToken(), { ...r.data });
      setAccount(r.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const age = calculateAge(form.date_of_birth);
  const category = getCategory(age);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <SeekerNav account={account} />
      <div className="max-w-md mx-auto px-4 py-8">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card text-center py-3">
              <div className="text-2xl font-bold text-primary">{stats.total_tickets}</div>
              <div className="text-xs text-gray-500 mt-0.5">Tickets</div>
            </div>
            <div className="card text-center py-3">
              <div className="text-2xl font-bold text-green-600">{stats.events_attended}</div>
              <div className="text-xs text-gray-500 mt-0.5">Attended</div>
            </div>
            <div className="card text-center py-3">
              <div className="text-2xl font-bold text-amber-600">{stats.family_members}</div>
              <div className="text-xs text-gray-500 mt-0.5">Family</div>
            </div>
          </div>
        )}

        <div className="card mb-5">
          <h2 className="font-bold text-gray-800 mb-5">My Profile</h2>
          <div className="space-y-4">

            {/* Phone — readonly */}
            <div>
              <label className="label">Mobile Number</label>
              <div className="input bg-gray-50 text-gray-500 cursor-not-allowed">
                +91 {account?.phone}
              </div>
              <p className="text-xs text-gray-400 mt-1">Phone number cannot be changed</p>
            </div>

            {/* Name */}
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} placeholder="Your full name"
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            {/* Sex */}
            <div>
              <label className="label">Sex *</label>
              <div className="flex gap-2 mt-1">
                {['male', 'female'].map(s => (
                  <button key={s} type="button" onClick={() => setForm({ ...form, sex: s })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all
                      ${form.sex === s ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                    {s === 'male' ? '♂ Male' : '♀ Female'}
                  </button>
                ))}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="label">Birthday</label>
              <input className="input" type="date"
                max={new Date().toISOString().split('T')[0]}
                value={form.date_of_birth}
                onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
              {age && category && (
                <div className="flex items-center gap-2 mt-2">
                  <span className={category.color}>{category.label}</span>
                  <span className="text-xs text-gray-500">Age {age} — updates automatically each year</span>
                </div>
              )}
            </div>

            {/* Zone / City */}
            <div>
              <label className="label">City / Zone</label>
              <ZonePicker
                value={form.zone_city}
                onChange={v => setForm({ ...form, zone_city: v })}
              />
            </div>

            {/* Profession */}
            <div>
              <label className="label">Profession</label>
              <ProfessionPicker
                value={form.profession}
                onChange={v => setForm({ ...form, profession: v })}
              />
            </div>

            {/* Email */}
            <div>
              <label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" type="email" value={form.email} placeholder="you@example.com"
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Volunteer Interests */}
        {volunteerOptions.length > 0 && (
          <div className="card mb-5">
            <h3 className="font-semibold text-gray-800 mb-1">🙌 Seva Interests</h3>
            <p className="text-xs text-gray-500 mb-4">
              Select your areas of interest. Saved to your profile and visible to organisers.
            </p>
            <div className="flex flex-wrap gap-2">
              {volunteerOptions.map(opt => {
                const selected = form.volunteer_interests.includes(opt.label);
                return (
                  <button key={opt.id} type="button" onClick={() => toggleInterest(opt.label)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all
                      ${selected ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary bg-white'}`}>
                    {selected ? '✓ ' : ''}{opt.label}
                  </button>
                );
              })}
            </div>
            {form.volunteer_interests.length > 0 && (
              <p className="text-xs text-green-600 mt-3">
                ✓ {form.volunteer_interests.length} interest{form.volunteer_interests.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>}
        {success && <p className="text-green-600 text-sm bg-green-50 rounded-xl px-3 py-2 mb-4">✓ Profile updated!</p>}

        <button onClick={save} disabled={saving} className="btn-primary w-full py-3">
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}