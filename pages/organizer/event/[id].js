import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../../lib/api';

export default function EventDashboard() {
  const router = useRouter();
  const { id } = router.query;
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    const u = localStorage.getItem('sy_user');
    if (!token) { router.push('/organizer/login'); return; }
    setUser(JSON.parse(u));
    if (!id) return;
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [evRes, statsRes, ticketsRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/events/${id}/dashboard`),
        api.get(`/events/${id}/attendees`)
      ]);
      setEvent(evRes.data);
      setStats(statsRes.data);
      setTickets(ticketsRes.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const exportCSV = () => {
    const headers = ['Name','Age Category','Sex','City/Zone','Email','Phone','Amount Paid','Discount Code','Checked In','Check-in Time'];
    const rows = tickets.map(t => [
      t.seeker_name, t.age_category, t.sex, t.zone_city || '',
      t.email || '', t.phone || '',
      t.final_amount || 0, t.discount_code_used || '',
      t.checked_in ? 'Yes' : 'No',
      t.checked_in_at ? new Date(t.checked_in_at).toLocaleString('en-IN') : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendees-${event?.title?.replace(/\s+/g,'-')}.csv`;
    a.click();
  };

  const filtered = tickets.filter(t => {
    const matchSearch = !search ||
      t.seeker_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.phone?.includes(search) ||
      t.zone_city?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ? true :
      filter === 'checked_in' ? t.checked_in :
      filter === 'not_checked_in' ? !t.checked_in :
      filter === t.age_category ? true :
      filter === t.sex ? true : false;
    return matchSearch && matchFilter;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/organizer/dashboard" className="text-gray-400 hover:text-primary text-sm">← Back</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800 text-sm truncate max-w-xs">{event?.title}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/checkin?event_id=${id}`}
            className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100">
            📷 Check-in
          </Link>
          {user?.role === 'organizer' && (
            <button onClick={exportCSV}
              className="text-sm px-3 py-1.5 bg-purple-50 text-primary rounded-lg font-medium hover:bg-purple-100">
              ⬇ Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Registered" value={stats.total_tickets} color="purple" icon="🎟" />
            <StatCard label="Checked In" value={stats.checked_in_count} color="green" icon="✅" />
            <StatCard label="Remaining" value={stats.total_tickets - stats.checked_in_count} color="amber" icon="⏳" />
            {user?.role === 'organizer' && (
              <StatCard label="Revenue" value={`₹${stats.total_revenue || 0}`} color="blue" icon="💰" />
            )}
          </div>
        )}

        {/* Category breakdown */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card text-center py-3">
              <div className="text-xs text-gray-500 mb-1">Child</div>
              <div className="text-2xl font-bold text-blue-600">{stats.child_count}</div>
            </div>
            <div className="card text-center py-3">
              <div className="text-xs text-gray-500 mb-1">Yuva</div>
              <div className="text-2xl font-bold text-green-600">{stats.yuva_count}</div>
            </div>
            <div className="card text-center py-3">
              <div className="text-xs text-gray-500 mb-1">Adult</div>
              <div className="text-2xl font-bold text-purple-600">{stats.adult_count}</div>
            </div>
          </div>
        )}

        {/* Search + Filter */}
        <div className="card mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input flex-1"
              placeholder="Search by name, email, phone, city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="input sm:w-48" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All seekers</option>
              <option value="checked_in">✅ Checked in</option>
              <option value="not_checked_in">⏳ Not yet</option>
              <option value="child">Child</option>
              <option value="yuva">Yuva</option>
              <option value="adult">Adult</option>
              <option value="male">♂ Male</option>
              <option value="female">♀ Female</option>
            </select>
          </div>
          <p className="text-xs text-gray-400 mt-2">Showing {filtered.length} of {tickets.length} seekers</p>
        </div>

        {/* Tickets table */}
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-purple-50 border-b border-purple-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">City/Zone</th>
                {user?.role === 'organizer' && (
                  <>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  </>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    No seekers found
                  </td>
                </tr>
              )}
              {filtered.map((tk, i) => (
                <tr key={i} className={`hover:bg-gray-50 transition-colors ${tk.checked_in ? 'bg-green-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{tk.seeker_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge-${tk.age_category} mr-1`}>
                      {tk.age_category?.charAt(0).toUpperCase() + tk.age_category?.slice(1)}
                    </span>
                    <span className="text-gray-500 text-xs">{tk.sex === 'male' ? '♂' : '♀'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{tk.zone_city || '—'}</td>
                  {user?.role === 'organizer' && (
                    <>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 text-xs">{tk.email}</div>
                        <div className="text-gray-400 text-xs">{tk.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {tk.final_amount === 0 ? <span className="text-green-600 text-xs">FREE</span> : `₹${tk.final_amount}`}
                        {tk.discount_code_used && (
                          <div className="text-xs text-purple-500">{tk.discount_code_used}</div>
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    {tk.checked_in ? (
                      <div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Admitted</span>
                        {tk.checked_in_at && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(tk.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⏳ Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  const colors = {
    purple: 'bg-purple-50 border-purple-100 text-primary',
    green:  'bg-green-50 border-green-100 text-green-700',
    amber:  'bg-amber-50 border-amber-100 text-amber-700',
    blue:   'bg-blue-50 border-blue-100 text-blue-700',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}