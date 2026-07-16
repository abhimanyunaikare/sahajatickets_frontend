import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';

export default function AccountsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [yearwise, setYearwise] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    const u = localStorage.getItem('sy_user');
    if (!token) { router.push('/organizer/login'); return; }
    const parsed = JSON.parse(u);
    if (!['organizer', 'accounts', 'admin'].includes(parsed.role)) {
      router.push('/organizer/dashboard'); return;
    }
    setUser(parsed);
    fetchData('');
  }, []);

  const fetchData = async (year) => {
    setLoading(true);
    try {
      const [sumRes, evRes] = await Promise.all([
        api.get(`/accounts/summary${year ? `?year=${year}` : ''}`),
        api.get(`/accounts/events${year ? `?year=${year}` : ''}`)
      ]);
      setSummary(sumRes.data.summary);
      setYearwise(sumRes.data.yearwise);
      setAvailableYears(sumRes.data.available_years);
      setEvents(evRes.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const onYearChange = (year) => {
    setSelectedYear(year);
    fetchData(year);
  };

  const exportEventsCSV = () => {
    const headers = ['Event','Start Date','End Date','City','Status','Total Tickets','Paid','Free','Child','Yuva','Adult','Male','Female','Gross Amount','Discounts Given','Net Revenue','Donations','Total Collection'];
    const rows = events.map(e => [
      e.title,
      new Date(e.start_date).toLocaleDateString('en-IN'),
      new Date(e.end_date).toLocaleDateString('en-IN'),
      e.city || '',
      e.status,
      e.total_tickets, e.paid_tickets, e.free_tickets,
      e.child_count, e.yuva_count, e.adult_count,
      e.male_count, e.female_count,
      e.gross_amount, e.discounts_given, e.ticket_revenue,
      e.donations,
      (parseFloat(e.ticket_revenue) + parseFloat(e.donations)).toFixed(2)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sy-accounts-${selectedYear || 'all'}.csv`;
    a.click();
  };

  const printReport = () => window.print();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading accounts…</div>;

  const totalCollection = parseFloat(summary?.total_ticket_revenue || 0) + parseFloat(summary?.total_donations || 0);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪷</span>
          <span className="font-bold text-primary">Accounts</span>
          <span className="text-gray-300 mx-2">|</span>
          <span className="text-sm text-gray-500">{user?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Year filter */}
          <select className="input !py-1.5 !px-3 text-sm w-32"
            value={selectedYear} onChange={e => onYearChange(e.target.value)}>
            <option value="">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportEventsCSV} className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100">
            ⬇ Excel/CSV
          </button>
          <button onClick={printReport} className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100">
            🖨 Print PDF
          </button>
          <Link href="/organizer/dashboard" className="text-sm text-gray-400 hover:text-gray-700">← Dashboard</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Print header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold">Sahaja Yoga Events — Accounts Report</h1>
          <p className="text-gray-500">{selectedYear || 'All Years'} · Generated {new Date().toLocaleDateString('en-IN')}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <BigStatCard label="Total Events" value={summary?.total_events || 0} icon="📅" color="purple" />
          <BigStatCard label="Total Tickets" value={summary?.total_tickets || 0} icon="🎟" color="blue" />
          <BigStatCard label="Ticket Revenue" value={`₹${Number(summary?.total_ticket_revenue || 0).toLocaleString('en-IN')}`} icon="💵" color="green" />
          <BigStatCard label="Total Dana" value={`₹${Number(summary?.total_donations || 0).toLocaleString('en-IN')}`} icon="🪷" color="amber" />
        </div>

        {/* Total collection highlight */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white rounded-2xl p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-sm mb-1">Total Collection {selectedYear ? `(${selectedYear})` : '(All Time)'}</p>
            <p className="text-4xl font-bold">₹{totalCollection.toLocaleString('en-IN')}</p>
            <p className="text-purple-300 text-xs mt-1">Tickets + Dana combined</p>
          </div>
          <div className="text-right">
            <p className="text-purple-200 text-sm">Discounts given</p>
            <p className="text-2xl font-semibold text-yellow-300">₹{Number(summary?.total_discounts_given || 0).toLocaleString('en-IN')}</p>
            <p className="text-purple-300 text-xs mt-1">Free tickets: {summary?.free_tickets || 0}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 print:hidden">
          {[['overview','📊 Overview'],['events','📋 Event-wise'],['yearwise','📅 Year-wise']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {(activeTab === 'overview' || true) && activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">Revenue Breakdown</h3>
              <div className="space-y-3">
                <BarRow label="Ticket Revenue" value={parseFloat(summary?.total_ticket_revenue || 0)} total={totalCollection} color="bg-primary" />
                <BarRow label="Dana / Donations" value={parseFloat(summary?.total_donations || 0)} total={totalCollection} color="bg-amber-400" />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Gross (before discounts)</span>
                  <span className="font-medium">₹{Number(summary?.gross_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Discounts applied</span>
                  <span className="font-medium text-red-500">- ₹{Number(summary?.total_discounts_given || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t">
                  <span>Net Collection</span>
                  <span className="text-primary">₹{totalCollection.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">Recent Events</h3>
              <div className="space-y-3">
                {events.slice(0, 5).map(ev => (
                  <div key={ev.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800 truncate max-w-48">{ev.title}</p>
                      <p className="text-xs text-gray-400">{new Date(ev.start_date).toLocaleDateString('en-IN')} · {ev.total_tickets} seekers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">₹{Number(parseFloat(ev.ticket_revenue) + parseFloat(ev.donations)).toLocaleString('en-IN')}</p>
                      <Link href={`/accounts/event/${ev.id}`} className="text-xs text-purple-400 hover:underline">Details →</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Event-wise tab */}
        {activeTab === 'events' && (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 border-b border-purple-100">
                <tr>
                  {['Event','Date','Tickets','Child/Yuva/Adult','♂/♀','Gross','Discount','Net Revenue','Dana','Total',''].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map(ev => {
                  const total = parseFloat(ev.ticket_revenue) + parseFloat(ev.donations);
                  return (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900 max-w-40 truncate">{ev.title}</div>
                        <div className="text-xs text-gray-400">{ev.city || ''}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(ev.start_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-3 py-3 text-center font-medium">{ev.total_tickets}</td>
                      <td className="px-3 py-3 text-center text-xs text-gray-500">
                        {ev.child_count}/{ev.yuva_count}/{ev.adult_count}
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-gray-500">
                        {ev.male_count}/{ev.female_count}
                      </td>
                      <td className="px-3 py-3 text-right">₹{Number(ev.gross_amount).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-right text-red-500">
                        {ev.discounts_given > 0 ? `-₹${Number(ev.discounts_given).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-gray-800">₹{Number(ev.ticket_revenue).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-right text-amber-600">
                        {ev.donations > 0 ? `₹${Number(ev.donations).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-primary whitespace-nowrap">
                        ₹{total.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/accounts/event/${ev.id}`}
                          className="text-xs text-primary hover:underline whitespace-nowrap">
                          Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-purple-50 font-bold">
                  <td className="px-3 py-3" colSpan="2">TOTAL</td>
                  <td className="px-3 py-3 text-center">{events.reduce((s,e) => s + parseInt(e.total_tickets), 0)}</td>
                  <td colSpan="2"></td>
                  <td className="px-3 py-3 text-right">₹{events.reduce((s,e) => s + parseFloat(e.gross_amount), 0).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-right text-red-500">-₹{events.reduce((s,e) => s + parseFloat(e.discounts_given), 0).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-right">₹{events.reduce((s,e) => s + parseFloat(e.ticket_revenue), 0).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-right text-amber-600">₹{events.reduce((s,e) => s + parseFloat(e.donations), 0).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-right text-primary">₹{events.reduce((s,e) => s + parseFloat(e.ticket_revenue) + parseFloat(e.donations), 0).toLocaleString('en-IN')}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Year-wise tab */}
        {activeTab === 'yearwise' && (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 border-b border-purple-100">
                <tr>
                  {['Year','Events','Tickets','Ticket Revenue','Dana','Total Collection'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {yearwise.map(row => (
                  <tr key={row.year} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-bold text-gray-800 text-base">{row.year}</td>
                    <td className="px-4 py-4 text-gray-600">{row.events}</td>
                    <td className="px-4 py-4 text-gray-600">{row.tickets}</td>
                    <td className="px-4 py-4 font-medium">₹{Number(row.ticket_revenue).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4 text-amber-600">₹{Number(row.donations).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4 font-bold text-primary text-base">
                      ₹{(parseFloat(row.ticket_revenue) + parseFloat(row.donations)).toLocaleString('en-IN')}
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

function BigStatCard({ label, value, icon, color }) {
  const colors = {
    purple: 'border-purple-100 bg-purple-50 text-primary',
    blue:   'border-blue-100 bg-blue-50 text-blue-700',
    green:  'border-green-100 bg-green-50 text-green-700',
    amber:  'border-amber-100 bg-amber-50 text-amber-700',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-60 mt-1">{label}</div>
    </div>
  );
}

function BarRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">₹{value.toLocaleString('en-IN')} <span className="text-gray-400">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}