import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../../lib/api';

export default function EventTransactions() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets');

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    if (!token) { router.push('/organizer/login'); return; }
    if (!id) return;
    Promise.all([
      api.get(`/accounts/transactions/${id}`),
      api.get(`/events/${id}`)
    ]).then(([txRes, evRes]) => {
      setData(txRes.data);
      setEvent(evRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const exportTicketsCSV = () => {
    if (!data) return;
    const headers = ['Name','Age','Category','Sex','City','Email','Phone','Base Amount','Discount','Final Amount','Discount Code','Payment ID','Order ID','Payment Status','Checked In','Check-in Time','Registered At'];
    const rows = data.tickets.map(t => [
      t.seeker_name, t.age, t.age_category, t.sex, t.zone_city || '',
      t.email, t.phone || '',
      t.base_amount, t.discount_amount, t.final_amount,
      t.discount_code_used || '',
      t.razorpay_payment_id || '',
      t.razorpay_order_id || '',
      t.payment_status,
      t.checked_in ? 'Yes' : 'No',
      t.checked_in_at ? new Date(t.checked_in_at).toLocaleString('en-IN') : '',
      new Date(t.created_at).toLocaleString('en-IN')
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `transactions-${event?.title?.replace(/\s+/g,'-')}.csv`;
    a.click();
  };

  const exportDonationsCSV = () => {
    if (!data) return;
    const headers = ['Donor Name','Email','Amount','Anonymous','Dedication','Payment ID','Date'];
    const rows = data.donations.map(d => [
      d.is_anonymous ? 'Anonymous' : (d.donor_name || ''),
      d.is_anonymous ? '' : (d.email || ''),
      d.amount, d.is_anonymous ? 'Yes' : 'No',
      d.dedication_note || '',
      d.razorpay_payment_id || '',
      new Date(d.created_at).toLocaleString('en-IN')
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `donations-${event?.title?.replace(/\s+/g,'-')}.csv`;
    a.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const totalTicketRevenue = data?.tickets.filter(t => t.payment_status === 'paid').reduce((s, t) => s + parseFloat(t.final_amount), 0) || 0;
  const totalDonations = data?.donations.reduce((s, d) => s + parseFloat(d.amount), 0) || 0;
  const totalDiscounts = data?.tickets.reduce((s, t) => s + parseFloat(t.discount_amount || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/accounts" className="text-gray-400 hover:text-primary text-sm">← Accounts</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800 text-sm truncate max-w-xs">{event?.title}</span>
        </div>
        <div className="flex gap-2">
            <Link href={`/accounts/bookings/${id}`} className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">
            🧾 Grouped Bookings
            </Link>
          <button onClick={exportTicketsCSV} className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium">⬇ Tickets CSV</button>
          <button onClick={exportDonationsCSV} className="text-sm px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg font-medium">⬇ Dana CSV</button>
          <button onClick={() => window.print()} className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">🖨 Print</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Event summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card text-center"><div className="text-2xl font-bold text-primary">{data?.tickets.length}</div><div className="text-xs text-gray-500 mt-1">Total Tickets</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-green-600">₹{totalTicketRevenue.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500 mt-1">Ticket Revenue</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-amber-600">₹{totalDonations.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500 mt-1">Dana Collected</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-purple-700">₹{(totalTicketRevenue + totalDonations).toLocaleString('en-IN')}</div><div className="text-xs text-gray-500 mt-1">Total Collection</div></div>
        </div>

        {/* Discount summary */}
        {data?.discount_summary?.length > 0 && (
          <div className="card mb-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Discount Code Usage</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 border-b">
                  <th className="text-left py-2">Code</th>
                  <th className="text-center py-2">Times Used</th>
                  <th className="text-right py-2">Total Discount Given</th>
                </tr></thead>
                <tbody>
                  {data.discount_summary.map(dc => (
                    <tr key={dc.code} className="border-b border-gray-50">
                      <td className="py-2 font-mono font-medium text-primary">{dc.code}</td>
                      <td className="py-2 text-center">{dc.times_used}</td>
                      <td className="py-2 text-right text-red-500">- ₹{Number(dc.total_discount_given).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-center">{data.discount_summary.reduce((s,d) => s + parseInt(d.times_used), 0)}</td>
                    <td className="py-2 text-right text-red-500">- ₹{totalDiscounts.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 print:hidden">
          {[['tickets',`🎟 Tickets (${data?.tickets.length})`],['donations',`🪷 Dana (${data?.donations.length})`]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tickets table */}
        {activeTab === 'tickets' && (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 border-b">
                <tr>
                  {['#','Name','Age','Sex','City','Base','Discount','Paid','Razorpay ID','Status','Checked In'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.tickets.map((t, i) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{t.seeker_name}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{t.age} <span className={`badge-${t.age_category}`}>{t.age_category}</span></td>
                    <td className="px-3 py-2 text-gray-500">{t.sex === 'male' ? '♂' : '♀'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{t.zone_city || '—'}</td>
                    <td className="px-3 py-2 text-right">₹{t.base_amount}</td>
                    <td className="px-3 py-2 text-right text-red-400">{t.discount_amount > 0 ? `-₹${t.discount_amount}` : '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700">
                      {t.payment_status === 'free' ? <span className="text-blue-500 text-xs">FREE</span> : `₹${t.final_amount}`}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-gray-400 break-all">{t.razorpay_payment_id || '—'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.payment_status === 'paid' ? 'bg-green-100 text-green-700' : t.payment_status === 'free' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t.payment_status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {t.checked_in
                        ? <span className="text-xs text-green-600">✓ {t.checked_in_at ? new Date(t.checked_in_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : ''}</span>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-purple-50 font-bold">
                  <td colSpan="5" className="px-3 py-3">TOTAL ({data?.tickets.length} tickets)</td>
                  <td className="px-3 py-3 text-right">₹{data?.tickets.reduce((s,t) => s + parseFloat(t.base_amount||0), 0).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-right text-red-500">-₹{totalDiscounts.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-right text-primary">₹{totalTicketRevenue.toLocaleString('en-IN')}</td>
                  <td colSpan="3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Donations table */}
        {activeTab === 'donations' && (
          <div className="card overflow-x-auto p-0">
            {data?.donations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No donations for this event</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-amber-50 border-b">
                  <tr>
                    {['#','Donor','Email','Amount','Dedication','Razorpay ID','Date'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.donations.map((d, i) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{d.is_anonymous ? <span className="text-gray-400 italic">Anonymous</span> : d.donor_name}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{d.is_anonymous ? '—' : d.email}</td>
                      <td className="px-3 py-2 font-semibold text-amber-700">₹{Number(d.amount).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs italic">{d.dedication_note || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">{d.razorpay_payment_id}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50 font-bold">
                    <td colSpan="3" className="px-3 py-3">TOTAL</td>
                    <td className="px-3 py-3 text-amber-700">₹{totalDonations.toLocaleString('en-IN')}</td>
                    <td colSpan="3"></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}