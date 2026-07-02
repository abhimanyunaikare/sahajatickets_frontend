import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../../lib/api';

export default function VolunteerInterestsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [volunteers, setVolunteers] = useState([]);
  const [event, setEvent] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    if (!token) { router.push('/organizer/login'); return; }
    if (!id) return;
    Promise.all([
      api.get(`/events/${id}`),
      api.get(`/events/${id}/volunteers/interests`),
      api.get('/volunteer-options')
    ]).then(([evRes, volRes, optRes]) => {
      setEvent(evRes.data);
      setVolunteers(volRes.data);
      setOptions(optRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const fetchFiltered = async (interest) => {
    setSelectedFilter(interest);
    try {
      const url = interest
        ? `/events/${id}/volunteers/interests?interest=${encodeURIComponent(interest)}`
        : `/events/${id}/volunteers/interests`;
      const r = await api.get(url);
      setVolunteers(r.data);
    } catch (err) { console.error(err); }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Age', 'Category', 'Sex', 'City/Zone', 'Phone', 'Email', 'Volunteer Interests'];
    const rows = volunteers.map(v => [
      v.seeker_name, v.age, v.age_category, v.sex,
      v.zone_city || '', v.phone || '', v.email || '',
      (v.volunteer_interests || []).join('; ')
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `volunteers-${event?.title?.replace(/\s+/g,'-')}.csv`;
    a.click();
  };

  // Group by interest for overview
  const interestCounts = {};
  volunteers.forEach(v => {
    (v.volunteer_interests || []).forEach(i => {
      interestCounts[i] = (interestCounts[i] || 0) + 1;
    });
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href={`/organizer/event/${id}`} className="text-gray-400 hover:text-primary text-sm">← Event</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800 text-sm">{event?.title} — Volunteers</span>
        </div>
        <button onClick={exportCSV} className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium">
          ⬇ Export CSV
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Interest summary chips */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter by Interest</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fetchFiltered('')}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${!selectedFilter ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
              All ({volunteers.length})
            </button>
            {options.map(opt => (
              <button key={opt.id} onClick={() => fetchFiltered(opt.label)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                  ${selectedFilter === opt.label ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                {opt.label} {interestCounts[opt.label] ? `(${interestCounts[opt.label]})` : '(0)'}
              </button>
            ))}
          </div>
        </div>

        {/* Volunteer list */}
        {volunteers.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🙌</div>
            <p className="text-gray-500">
              {selectedFilter
                ? `No volunteers interested in "${selectedFilter}"`
                : 'No seekers have selected volunteer interests yet'}
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 border-b">
                <tr>
                  {['#', 'Name', 'Age', 'Sex', 'City/Zone', 'Contact', 'Interests'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {volunteers.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{v.seeker_name}</td>
                    <td className="px-3 py-3">
                      <span className={`badge-${v.age_category}`}>{v.age_category}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{v.sex === 'male' ? '♂' : '♀'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{v.zone_city || '—'}</td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-gray-600">{v.phone || '—'}</div>
                      <div className="text-xs text-gray-400">{v.email || '—'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(v.volunteer_interests || []).map(interest => (
                          <span key={interest}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium
                              ${selectedFilter === interest
                                ? 'bg-primary text-white'
                                : 'bg-purple-100 text-primary'}`}>
                            {interest}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}