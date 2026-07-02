import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../../lib/api';

export default function VolunteerDirectory() {
  const router = useRouter();
  const [data, setData] = useState({ volunteers: [], total: 0, interest_counts: [] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ interest: '', category: '', zone: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    if (!token) { router.push('/organizer/login'); return; }
    fetchDirectory();
  }, []);

  const fetchDirectory = async (f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.interest) params.append('interest', f.interest);
      if (f.category) params.append('category', f.category);
      if (f.zone) params.append('zone', f.zone);
      const r = await api.get(`/volunteer-directory?${params.toString()}`);
      setData(r.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const setFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchDirectory(newFilters);
  };

  const clearFilters = () => {
    const reset = { interest: '', category: '', zone: '' };
    setFilters(reset);
    setSearch('');
    fetchDirectory(reset);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Age', 'Category', 'Relation', 'Phone', 'Email', 'Volunteer Interests'];
    const rows = filtered.map(v => [
      v.seeker_name, v.age || '', v.age_category, v.relation,
      v.phone || '', v.email || '',
      (v.volunteer_interests || []).join('; ')
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `volunteer-directory.csv`;
    a.click();
  };

  const filtered = data.volunteers.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.seeker_name?.toLowerCase().includes(q) ||
      v.phone?.includes(q) ||
      v.email?.toLowerCase().includes(q);
  });

  const hasFilters = filters.interest || filters.category || filters.zone;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/organizer/dashboard" className="text-gray-400 hover:text-primary text-sm">← Dashboard</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">🙌 Volunteer Directory</span>
        </div>
        <button onClick={exportCSV}
          className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100">
          ⬇ Export CSV
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card text-center py-3">
            <div className="text-2xl font-bold text-primary">{data.total}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total Volunteers</div>
          </div>
          {['child', 'yuva', 'adult'].map(cat => (
            <div key={cat} className="card text-center py-3">
              <div className={`text-2xl font-bold ${cat === 'child' ? 'text-blue-600' : cat === 'yuva' ? 'text-green-600' : 'text-purple-600'}`}>
                {data.volunteers.filter(v => v.age_category === cat).length}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 capitalize">{cat}</div>
            </div>
          ))}
        </div>

        {/* Interest filter chips */}
        {data.interest_counts.length > 0 && (
          <div className="card mb-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter by Interest</h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilter('interest', '')}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all
                  ${!filters.interest ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                All
              </button>
              {data.interest_counts.map(ic => (
                <button key={ic.interest} onClick={() => setFilter('interest', ic.interest)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all
                    ${filters.interest === ic.interest ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                  {ic.interest} <span className="opacity-70">({ic.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search + filters row */}
        <div className="card mb-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="input col-span-2" placeholder="Search by name, phone, email…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input" value={filters.category}
              onChange={e => setFilter('category', e.target.value)}>
              <option value="">All categories</option>
              <option value="child">👶 Child</option>
              <option value="yuva">🧑 Yuva</option>
              <option value="adult">👤 Adult</option>
            </select>
            <input className="input" placeholder="Filter by city/zone…"
              value={filters.zone}
              onChange={e => setFilter('zone', e.target.value)} />
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {data.total} volunteers
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-600">
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Volunteer table */}
        {loading ? (
          <div className="card text-center py-12 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🙌</div>
            <p className="text-gray-500">No volunteers found matching your filters</p>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 border-b">
                <tr>
                  {['#', 'Name', 'Age', 'Category', 'Relation', 'Contact', 'Volunteer Interests'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{v.seeker_name}</td>
                    <td className="px-3 py-3 text-gray-500">{v.age || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`badge-${v.age_category}`}>
                        {v.age_category?.charAt(0).toUpperCase() + v.age_category?.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 capitalize text-xs">{v.relation}</td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-gray-700">{v.phone || '—'}</div>
                      <div className="text-xs text-gray-400">{v.email || '—'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(v.volunteer_interests || []).map(interest => (
                          <span key={interest}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer transition-all
                              ${filters.interest === interest
                                ? 'bg-primary text-white'
                                : 'bg-purple-100 text-primary hover:bg-primary hover:text-white'}`}
                            onClick={() => setFilter('interest', interest === filters.interest ? '' : interest)}>
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