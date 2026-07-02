import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    const u = localStorage.getItem('sy_user');
    if (!token) { router.push('/organizer/login'); return; }
    setUser(JSON.parse(u));
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const r = await api.get('/events/my/all');
      setEvents(r.data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem('sy_token');
    localStorage.removeItem('sy_user');
    router.push('/organizer/login');
  };

  const toggleStatus = async (eventId, currentStatus) => {
    const next = currentStatus === 'published' ? 'closed' : 'published';
    await api.patch(`/events/${eventId}/status`, { status: next });
    fetchEvents();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪷</span>
          <span className="font-bold text-primary">SY Events</span>
          <span className="text-gray-300 mx-2">|</span>
          <span className="text-sm text-gray-600">{user?.name}</span>
          <span className="text-xs bg-purple-100 text-primary px-2 py-0.5 rounded-full ml-1">{user?.role}</span>
        </div>
        {(user?.role === 'organizer' || user?.role === 'accounts') && (
            <Link href="/accounts" className="text-sm text-gray-500 hover:text-primary font-medium">
              📊 Accounts
            </Link>
          )}
          {user?.role === 'organizer' && (
            <Link href="/organizer/users" className="text-sm text-gray-500 hover:text-primary font-medium">
              👥 Users
            </Link>
          )}
          {user?.role === 'organizer' && (
            <Link href="/organizer/settings" className="text-sm text-gray-500 hover:text-primary font-medium">
              ⚙️ Settings
            </Link>
          )}
          <Link href="/organizer/change-password" className="text-sm text-gray-400 hover:text-gray-700">🔑 Password</Link>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-700 ml-2">Sign out</button>
        
        </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
  <h1 className="text-xl font-bold text-gray-800">My Events</h1>
  <div className="flex items-center gap-3">
    {user?.role === 'organizer' && (
      <button onClick={() => setShowCreate(true)} className="btn-primary !px-5 !py-2 text-sm">
        + Create Event
      </button>
    )}
    {user?.role === 'organizer' && (
      <Link 
        href="/organizer/volunteer-directory" 
        className="inline-flex items-center justify-center border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 rounded-md transition-colors"
      >
        🙌 Volunteers
      </Link>
    )}
  </div>
</div>

        {events.length === 0 && !showCreate && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500 mb-4">No events yet</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Create your first event</button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {events.map(ev => (
            <div key={ev.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-800 text-base leading-tight pr-2">{ev.title}</h3>
                <StatusBadge status={ev.status} />
              </div>
              <p className="text-sm text-gray-500 mb-1">📅 {new Date(ev.start_date).toLocaleDateString('en-IN')}</p>
              <p className="text-sm text-gray-500 mb-4">📍 {ev.venue}{ev.city ? `, ${ev.city}` : ''}</p>

              <div className="flex gap-2 flex-wrap">
                <Link href={`/organizer/event/${ev.id}`}
                  className="text-sm px-3 py-1.5 bg-purple-50 text-primary rounded-lg hover:bg-purple-100 font-medium">
                  Dashboard
                </Link>
                <Link href={`/organizer/edit/${ev.id}`}
                  className="text-sm px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 font-medium">
                  ✏️ Edit
                </Link>
                <Link href={`/checkin?event_id=${ev.id}`}
                  className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium">
                  📷 Check-in
                </Link>
                <Link href={`/events/${ev.id}`} target="_blank"
                  className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">
                  View Page ↗
                </Link>
                {user?.role === 'organizer' && (
                  <button onClick={() => toggleStatus(ev.id, ev.status)}
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
                      ev.status === 'published'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}>
                    {ev.status === 'published' ? 'Close registrations' : 'Publish'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showCreate && (
          <CreateEventModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchEvents(); }} />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { published: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-500', closed: 'bg-red-100 text-red-600' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || ''}`}>{status}</span>;
}

function CreateEventModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', venue: '', city: '', state: '',
    start_date: '', end_date: '', start_time: '', total_capacity: 200,
    is_free: false,
    donation_enabled: true,
    sex_based_pricing: true,
    child_price: 0, child_male_price: 0, child_female_price: 0, child_max_age: 12,
    yuva_price: 100, yuva_male_price: 100, yuva_female_price: 100, yuva_max_age: 25,
    adult_price: 200, adult_male_price: 200, adult_female_price: 200,
    languages: ['en']
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const LANGS = { en:'English', hi:'हिंदी', mr:'मराठी', gu:'ગુજરાતી', ta:'தமிழ்', te:'తెలుగు', kn:'ಕನ್ನಡ', bn:'বাংলা', pa:'ਪੰਜਾਬੀ' };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleLang = (code) => {
    setForm(f => ({ ...f, languages: f.languages.includes(code)
      ? f.languages.filter(l => l !== code)
      : [...f.languages, code]
    }));
  };

  const submit = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/events', form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create event');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Create New Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="space-y-5">
          <Section title="Event Details">
            <Field label="Event Title *">
              <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Sahasrara Puja 2025" />
            </Field>
            <Field label="Description">
              <textarea className="input min-h-20 resize-none" value={form.description}
                onChange={e => set('description', e.target.value)} placeholder="About the event…" />
            </Field>
          </Section>

          <Section title="Venue & Dates">
            <Field label="Venue *">
              <input className="input" value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Hall name, address" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City"><input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" /></Field>
              <Field label="State"><input className="input" value={form.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date *"><input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></Field>
              <Field label="End Date *"><input className="input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Time"><input className="input" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} /></Field>
              <Field label="Capacity"><input className="input" type="number" value={form.total_capacity} onChange={e => set('total_capacity', e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Pricing">
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} />
              <span className="text-sm font-medium text-gray-700">This is a free event</span>
            </label>

            {!form.is_free && (
              <>
                {/* Male/Female different charges toggle */}
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Male / female charges different?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => set('sex_based_pricing', true)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${form.sex_based_pricing ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                      Yes — different rates
                    </button>
                    <button type="button" onClick={() => set('sex_based_pricing', false)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${!form.sex_based_pricing ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                      No — same rate for all
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left pb-2">Category</th>
                        {form.sex_based_pricing ? (
                          <>
                            <th className="pb-2">♂ Male (₹)</th>
                            <th className="pb-2">♀ Female (₹)</th>
                          </>
                        ) : (
                          <th className="pb-2">Price (₹)</th>
                        )}
                        <th className="pb-2">Max Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Child','child'],
                        ['Yuva','yuva'],
                        ['Adult','adult'],
                      ].map(([label, key]) => (
                        <tr key={key}>
                          <td className="py-1 pr-2 font-medium text-gray-700">{label}</td>
                          {form.sex_based_pricing ? (
                            <>
                              <td className="py-1 px-1"><input className="input !py-2 text-center" type="number" value={form[`${key}_male_price`]} onChange={e => set(`${key}_male_price`, e.target.value)} /></td>
                              <td className="py-1 px-1"><input className="input !py-2 text-center" type="number" value={form[`${key}_female_price`]} onChange={e => set(`${key}_female_price`, e.target.value)} /></td>
                            </>
                          ) : (
                            <td className="py-1 px-1"><input className="input !py-2 text-center" type="number" value={form[`${key}_price`]} onChange={e => set(`${key}_price`, e.target.value)} /></td>
                          )}
                          <td className="py-1 pl-1">{key !== 'adult' ? <input className="input !py-2 text-center" type="number" value={form[`${key}_max_age`]} onChange={e => set(`${key}_max_age`, e.target.value)} /> : <span className="text-gray-400 text-xs px-3">26+</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Section>

          <Section title="Donation">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={form.donation_enabled} onChange={e => set('donation_enabled', e.target.checked)} />
              <span className="text-sm font-medium text-gray-700">Allow seekers to add a Dana (donation) during registration</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">Enabled by default for all new events</p>
          </Section>

          <Section title="Supported Languages">
            <p className="text-xs text-gray-500 mb-3">Seekers can register in these languages</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LANGS).map(([code, label]) => (
                <button key={code} onClick={() => toggleLang(code)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                    form.languages.includes(code)
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-300 text-gray-600 hover:border-primary'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {error && <p className="text-red-500 text-sm mt-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creating…' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div>
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div><label className="label">{label}</label>{children}</div>
);
