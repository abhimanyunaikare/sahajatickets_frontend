import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../../lib/api';

export default function BookingsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [bookings, setBookings] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    if (!token) { router.push('/organizer/login'); return; }
    if (!id) return;
    Promise.all([
      api.get(`/accounts/bookings/${id}`),
      api.get(`/events/${id}`)
    ]).then(([bRes, eRes]) => {
      setBookings(bRes.data);
      setEvent(eRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const exportCSV = () => {
    const headers = ['Booking ID','Seekers','Ticket Count','Total Amount','Contact Email','Contact Phone','Payment Status','Razorpay Payment ID','Razorpay Order ID','Booked At'];
    const rows = bookings.map(b => [
      b.booking_group_id, b.seeker_names, b.ticket_count, b.total_amount,
      b.contact_email || '', b.contact_phone || '',
      b.payment_status, b.razorpay_payment_id || '', b.razorpay_order_id || '',
      new Date(b.booked_at).toLocaleString('en-IN')
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bookings-${event?.title?.replace(/\s+/g,'-')}.csv`;
    a.click();
  };

  const filtered = bookings.filter(b =>
    !search ||
    b.seeker_names?.toLowerCase().includes(search.toLowerCase()) ||
    b.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
    b.contact_phone?.includes(search) ||
    b.razorpay_payment_id?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = bookings.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
  const multiSeekerCount = bookings.filter(b => b.ticket_count > 1).length;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/accounts/event/${id}`} className="text-gray-400 hover:text-primary text-sm">← Event Details</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800 text-sm truncate max-w-xs">{event?.title} — Bookings</span>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium">⬇ Export CSV</button>
          <button onClick={() => window.print()} className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">🖨 Print</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card text-center"><div className="text-2xl font-bold text-primary">{bookings.length}</div><div className="text-xs text-gray-500 mt-1">Total Bookings</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-blue-600">{multiSeekerCount}</div><div className="text-xs text-gray-500 mt-1">Multi-seeker Bookings</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-green-600">{bookings.reduce((s,b)=>s+parseInt(b.ticket_count),0)}</div><div className="text-xs text-gray-500 mt-1">Total Tickets</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-purple-700">₹{totalAmount.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500 mt-1">Total Amount</div></div>
        </div>

        {/* Search */}
        <div className="card mb-4">
          <input className="input" placeholder="Search by seeker name, email, phone, or payment ID…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <p className="text-xs text-gray-400 mt-2">Showing {filtered.length} of {bookings.length} bookings</p>
        </div>

        {/* Bookings table */}
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-purple-50 border-b">
              <tr>
                {['#','Seekers in this booking','Tickets','Amount','Contact','Payment ID','Status','Booked At'].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="text-center py-12 text-gray-400">No bookings found</td></tr>
              )}
              {filtered.map((b, i) => (
                <tr key={b.booking_group_id} className={`hover:bg-gray-50 ${b.ticket_count > 1 ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900 max-w-xs">{b.seeker_names}</div>
                    {b.ticket_count > 1 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                        Group booking
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold">{b.ticket_count}</td>
                  <td className="px-3 py-3 text-right font-semibold text-green-700">
                    {b.payment_status === 'free' ? <span className="text-blue-500 text-xs">FREE</span> : `₹${Number(b.total_amount).toLocaleString('en-IN')}`}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-xs text-gray-600">{b.contact_email || '—'}</div>
                    <div className="text-xs text-gray-400">{b.contact_phone || '—'}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs text-gray-400 break-all">{b.razorpay_payment_id || '—'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {b.payment_status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(b.booked_at).toLocaleDateString('en-IN')} {new Date(b.booked_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                  </td>
                </tr>
              ))}
              <tr className="bg-purple-50 font-bold">
                <td colSpan="2" className="px-3 py-3">TOTAL ({bookings.length} bookings)</td>
                <td className="px-3 py-3 text-center">{bookings.reduce((s,b)=>s+parseInt(b.ticket_count),0)}</td>
                <td className="px-3 py-3 text-right text-primary">₹{totalAmount.toLocaleString('en-IN')}</td>
                <td colSpan="4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}