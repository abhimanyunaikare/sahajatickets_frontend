import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../../lib/api';

const LANGS = { en:'English', hi:'हिंदी', mr:'मराठी', gu:'ગુજરાતી', ta:'தமிழ்', te:'తెలుగు', kn:'ಕನ್ನಡ', bn:'বাংলা', pa:'ਪੰਜਾਬੀ' };

export default function EditEvent() {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    const u = localStorage.getItem('sy_user');
    if (!token) { router.push('/organizer/login'); return; }
    const parsed = JSON.parse(u || '{}');
    if (!['organizer', 'admin'].includes(parsed.role)) {
      router.push('/organizer/dashboard');
      return;
    }
    if (!id) return;
    api.get(`/events/${id}`).then(r => {
      const ev = r.data;
      setForm({
        title: ev.title || '', description: ev.description || '',
        venue: ev.venue || '', city: ev.city || '', state: ev.state || '',
        start_date: ev.start_date?.split('T')[0] || '', end_date: ev.end_date?.split('T')[0] || '',
        start_time: ev.start_time || '', total_capacity: ev.total_capacity || 200,
        is_free: ev.is_free || false,
        donation_enabled: ev.donation_enabled !== false,
        sex_based_pricing: ev.sex_based_pricing !== false,
        child_price: ev.child_male_price || 0, child_male_price: ev.child_male_price || 0, child_female_price: ev.child_female_price || 0, child_max_age: ev.child_max_age || 12,
        yuva_price: ev.yuva_male_price || 0, yuva_male_price: ev.yuva_male_price || 0, yuva_female_price: ev.yuva_female_price || 0, yuva_max_age: ev.yuva_max_age || 25,
        adult_price: ev.adult_male_price || 0, adult_male_price: ev.adult_male_price || 0, adult_female_price: ev.adult_female_price || 0,
        languages: ev.languages || ['en']
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleLang = (code) => {
    setForm(f => ({ ...f, languages: f.languages.includes(code) ? f.languages.filter(l => l !== code) : [...f.languages, code] }));
  };

  const save = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try {
      await api.patch(`/events/${id}`, form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading || !form) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/organizer/dashboard" className="text-gray-400 hover:text-primary text-sm">← Dashboard</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">Edit Event</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card space-y-5">
          <Section title="Event Details">
            <Field label="Event Title *"><input className="input" value={form.title} onChange={e => set('title', e.target.value)} /></Field>
            <Field label="Description"><textarea className="input min-h-20 resize-none" value={form.description} onChange={e => set('description', e.target.value)} /></Field>
          </Section>

          <Section title="Venue & Dates">
            <Field label="Venue *"><input className="input" value={form.venue} onChange={e => set('venue', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City"><input className="input" value={form.city} onChange={e => set('city', e.target.value)} /></Field>
              <Field label="State"><input className="input" value={form.state} onChange={e => set('state', e.target.value)} /></Field>
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
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Male / female charges different?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => set('sex_based_pricing', true)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${form.sex_based_pricing ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600'}`}>
                      Yes — different rates
                    </button>
                    <button type="button" onClick={() => set('sex_based_pricing', false)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${!form.sex_based_pricing ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600'}`}>
                      No — same rate
                    </button>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left pb-2">Category</th>
                      {form.sex_based_pricing ? (<><th className="pb-2">♂ Male</th><th className="pb-2">♀ Female</th></>) : <th className="pb-2">Price</th>}
                      <th className="pb-2">Max Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[['Child','child'],['Yuva','yuva'],['Adult','adult']].map(([label, key]) => (
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
              </>
            )}
          </Section>

          <Section title="Donation">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={form.donation_enabled} onChange={e => set('donation_enabled', e.target.checked)} />
              <span className="text-sm font-medium text-gray-700">Allow Dana (donation) during registration</span>
            </label>
          </Section>

          <Section title="Languages">
            <div className="flex flex-wrap gap-2">
              {Object.entries(LANGS).map(([code, label]) => (
                <button key={code} type="button" onClick={() => toggleLang(code)}
                  className={`px-3 py-1.5 rounded-xl text-sm border ${form.languages.includes(code) ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {error && <p className="text-red-500 text-sm mt-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-4 bg-green-50 rounded-lg px-3 py-2">✓ Saved successfully</p>}

        <button onClick={save} disabled={saving} className="btn-primary w-full mt-6 py-3">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div><h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3><div className="space-y-3">{children}</div></div>
);
const Field = ({ label, children }) => (<div><label className="label">{label}</label>{children}</div>);