import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { seekerApi, getSeekerToken, getSeekerAccount } from '../../lib/api';
import { SeekerNav } from '../family';

export default function MyTickets() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (!getSeekerToken()) { router.push('/login?next=/my-tickets'); return; }
    setAccount(getSeekerAccount());
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const r = await seekerApi.get('/seeker-tickets');
      setTickets(r.data);
    } catch (err) {
      if (err.response?.status === 401) router.push('/login');
    } finally { setLoading(false); }
  };

  const downloadTicket = (tk) => {
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify({ uuid: tk.qr_uuid, platform: 'sy-events' }))}`;
    qrImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 520;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 520);
      ctx.drawImage(qrImg, 50, 30, 300, 300);
      ctx.strokeStyle = '#E2D9F3'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(40, 350); ctx.lineTo(360, 350); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1F0A3C'; ctx.font = 'bold 22px Arial';
      ctx.fillText(tk.seeker_name, 200, 385);
      ctx.fillStyle = '#6B21A8'; ctx.font = '15px Arial';
      ctx.fillText(`${tk.age_category.charAt(0).toUpperCase() + tk.age_category.slice(1)} · ${tk.sex === 'male' ? '♂ Male' : '♀ Female'}`, 200, 412);
      ctx.fillStyle = '#555555'; ctx.font = '13px Arial';
      ctx.fillText(tk.event_title, 200, 438);
      ctx.fillStyle = '#888888'; ctx.font = '12px Arial';
      ctx.fillText(new Date(tk.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 200, 458);
      ctx.fillStyle = '#B0A0CC'; ctx.font = '11px Arial';
      ctx.fillText('Jai Shri Mataji 🙏', 200, 505);
      const link = document.createElement('a');
      link.download = `ticket-${tk.seeker_name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const upcoming = tickets.filter(t => new Date(t.end_date) >= new Date());
  const past = tickets.filter(t => new Date(t.end_date) < new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      <SeekerNav account={account} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">🎟 My Coupons</h1>
          <Link href="/" className="btn-primary !px-4 !py-2 text-sm">Book Coupon</Link>
        </div>

        {tickets.length === 0 && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">🎟</div>
            <p className="text-gray-500 mb-4">No tickets yet</p>
            <Link href="/" className="btn-primary">Browse Events</Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h2>
            <div className="space-y-4">
              {upcoming.map(tk => <TicketCard key={tk.id} ticket={tk} onDownload={downloadTicket} />)}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past Events</h2>
            <div className="space-y-4 opacity-70">
              {past.map(tk => <TicketCard key={tk.id} ticket={tk} onDownload={downloadTicket} past />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket: tk, onDownload, past }) {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className={`card border-2 ${tk.checked_in ? 'border-green-200' : past ? 'border-gray-100' : 'border-purple-100'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-800">{tk.event_title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            📅 {new Date(tk.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-xs text-gray-500">📍 {tk.venue}{tk.city ? `, ${tk.city}` : ''}</p>
        </div>
        {tk.checked_in
          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ Attended</span>
          : past
            ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Past</span>
            : <span className="text-xs bg-purple-100 text-primary px-2 py-1 rounded-full font-medium">Confirmed</span>
        }
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-800">{tk.seeker_name}</span>
        <span className={`badge-${tk.age_category}`}>{tk.age_category}</span>
        <span className="text-gray-400 text-xs">{tk.sex === 'male' ? '♂' : '♀'}</span>
        {tk.category_overridden && (
          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Modified</span>
        )}
      </div>

      {showQR && (
        <div className="flex justify-center my-3">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify({ uuid: tk.qr_uuid, platform: 'sy-events' }))}`}
            alt="QR Code" className="w-44 h-44 rounded-xl border-4 border-white shadow-md"
          />
        </div>
      )}

    <div className="flex gap-2 mt-2">
        {!past ? (
          <>
            <button onClick={() => setShowQR(!showQR)}
              className="flex-1 text-sm py-2 rounded-xl border border-primary text-primary hover:bg-purple-50 font-medium">
              {showQR ? 'Hide QR' : '📱 Show QR'}
            </button>
            <button onClick={() => onDownload(tk)}
              className="flex-1 text-sm py-2 rounded-xl bg-primary text-white hover:bg-purple-800 font-medium">
              ⬇ Download
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-400 text-center w-full py-1">Past programme — QR no longer valid</p>
        )}
      </div>
    </div>
  );
}