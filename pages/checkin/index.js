import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../lib/api';

export default function CheckinPage() {
  const router = useRouter();
  const { event_id: queryEventId } = router.query;
  const scannerRef = useRef(null);
  const scannerInstance = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(queryEventId || '');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    const u = localStorage.getItem('sy_user');
    if (!token) { router.push('/organizer/login?next=/checkin'); return; }
    setAuthed(true);
    setUser(JSON.parse(u || '{}'));
    fetchActiveEvents();
  }, []);

  useEffect(() => {
    if (queryEventId) setSelectedEventId(queryEventId);
  }, [queryEventId]);

  useEffect(() => {
    if (selectedEventId) fetchStats();
  }, [selectedEventId]);

  const fetchActiveEvents = async () => {
    try {
      // Checkin seva sees only published events
      const r = await api.get('/events');
      setEvents(r.data.filter(e => e.status === 'published'));
    } catch {}
  };

  const fetchStats = async () => {
    if (!selectedEventId) return;
    try {
      const r = await api.get(`/events/${selectedEventId}/dashboard`);
      setStats(r.data);
    } catch {}
  };

  const startScanner = async () => {
    if (!selectedEventId) { alert('Please select a programme first'); return; }
    setScanning(true);
    setResult(null);
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('qr-reader');
    scannerInstance.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          await processQR(decodedText);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      alert('Camera access denied. Please allow camera permission.');
    }
  };

  const stopScanner = async () => {
    if (scannerInstance.current) {
      try { await scannerInstance.current.stop(); } catch {}
    }
    setScanning(false);
  };

  const processQR = async (qrData) => {
    setLoading(true);
    try {
      const r = await api.post('/tickets/checkin', { qr_data: qrData });
      setResult(r.data);
      fetchStats();
    } catch (err) {
      setResult({ success: false, status: 'error', message: err.response?.data?.error || 'Check-in failed' });
    } finally { setLoading(false); }
  };

  const scanAgain = () => { setResult(null); startScanner(); };

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🪷</span>
          <span className="font-bold text-primary">Check-in</span>
        </div>
        <span className="text-xs text-gray-400">{user?.name}</span>
      </div>

      <div className="max-w-sm mx-auto px-4 py-5">

        {/* Programme selector */}
        <div className="card mb-4">
          <label className="label">Select Programme</label>
          <select className="input" value={selectedEventId}
            onChange={e => { setSelectedEventId(e.target.value); setResult(null); }}>
            <option value="">— Select active programme —</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title} · {new Date(ev.start_date).toLocaleDateString('en-IN')}
              </option>
            ))}
          </select>
          {events.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">No active programmes at the moment.</p>
          )}
        </div>

        {/* Stats */}
        {stats && selectedEventId && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="Checked In" value={stats.checked_in_count} color="green" />
            <StatCard label="Total" value={stats.total_tickets} color="purple" />
            <StatCard label="Remaining" value={stats.total_tickets - stats.checked_in_count} color="amber" />
          </div>
        )}

        {/* Scanner */}
        {selectedEventId && (
          <div className="card mb-4">
            <div id="qr-reader" className={`w-full rounded-xl overflow-hidden ${scanning ? 'min-h-64' : 'hidden'}`} />

            {!scanning && !result && !loading && (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">📷</div>
                <p className="text-gray-600 font-medium mb-4">Scan member's QR coupon</p>
                <button onClick={startScanner} className="btn-primary w-full py-3">
                  Start Scanner
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <p className="text-gray-500">Verifying…</p>
              </div>
            )}

            {scanning && (
              <button onClick={stopScanner}
                className="mt-3 w-full text-center text-sm text-red-500 py-2">
                ✕ Cancel
              </button>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`card text-center mb-4 ${
            result.status === 'admitted' ? 'bg-green-50 border-green-200' :
            result.status === 'already_used' ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'}`}>
            <div className="text-5xl mb-2">
              {result.status === 'admitted' ? '✅' : result.status === 'already_used' ? '⚠️' : '❌'}
            </div>
            <h2 className={`text-xl font-bold mb-1 ${
              result.status === 'admitted' ? 'text-green-700' :
              result.status === 'already_used' ? 'text-amber-700' : 'text-red-700'}`}>
              {result.status === 'admitted' ? 'ADMITTED' :
               result.status === 'already_used' ? 'ALREADY CHECKED IN' : 'INVALID'}
            </h2>
            {result.seeker_name && (
              <div className="mt-2">
                <p className="font-semibold text-gray-800 text-lg">{result.seeker_name}</p>
                {result.age_category && (
                  <span className={`badge-${result.age_category}`}>
                    {result.age_category} {result.sex === 'male' ? '♂' : '♀'}
                  </span>
                )}
                {result.zone_city && <p className="text-sm text-gray-500 mt-1">📍 {result.zone_city}</p>}
                {result.checked_in_at && (
                  <p className="text-xs text-amber-600 mt-1">
                    Scanned at {new Date(result.checked_in_at).toLocaleTimeString('en-IN')}
                  </p>
                )}
              </div>
            )}
            {result.message && <p className="text-sm text-gray-500 mt-2">{result.message}</p>}
            <button onClick={scanAgain} className="btn-primary w-full mt-4 py-2.5">
              Scan Next
            </button>
          </div>
        )}

        {/* Manual lookup */}
        {selectedEventId && (
          <div className="card bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Can't scan? Search member
            </p>
            <ManualLookup eventId={selectedEventId} onCheckin={() => { fetchStats(); setResult(null); }} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-primary',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold">{value ?? '—'}</div>
      <div className="text-xs mt-0.5 opacity-70">{label}</div>
    </div>
  );
}

function ManualLookup({ eventId, onCheckin }) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('name');
  const [tickets, setTickets] = useState([]);
  const [searched, setSearched] = useState(false);
  const [checkingIn, setCheckingIn] = useState(null);
  const [message, setMessage] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setMessage('');
    try {
      const params = new URLSearchParams();
      params.append(searchType, query.trim());
      const r = await api.get(`/tickets/lookup?${params.toString()}`);
      const filtered = r.data.filter(t =>
        !eventId || t.event_id === eventId || true // show all for now, filter by event
      );
      setTickets(r.data);
      setSearched(true);
    } catch {}
  };

  const checkinManual = async (ticket) => {
    setCheckingIn(ticket.id);
    setMessage('');
    try {
      const r = await api.post('/tickets/checkin', {
        qr_data: JSON.stringify({ uuid: ticket.qr_uuid, platform: 'sy-events' })
      });
      if (r.data.status === 'admitted') {
        setMessage(`✅ ${ticket.seeker_name} checked in successfully!`);
        setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, checked_in: true } : t));
        onCheckin();
      } else if (r.data.status === 'already_used') {
        setMessage(`⚠️ ${ticket.seeker_name} is already checked in.`);
      }
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || 'Check-in failed'}`);
    } finally { setCheckingIn(null); }
  };

  return (
    <div>
      {/* Search type tabs */}
      <div className="flex gap-1 mb-3">
        {[['name', '👤 Name'], ['phone', '📞 Phone'], ['email', '✉️ Email']].map(([type, label]) => (
          <button key={type} onClick={() => { setSearchType(type); setTickets([]); setSearched(false); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
              ${searchType === type ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <input className="input flex-1 text-sm !py-2"
          placeholder={searchType === 'name' ? 'Search by name…' : searchType === 'phone' ? '10-digit phone…' : 'Email address…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()} />
        <button onClick={search} className="btn-primary !px-4 !py-2 text-sm">Find</button>
      </div>

      {message && (
        <p className={`text-sm rounded-xl px-3 py-2 mb-3 ${message.startsWith('✅') ? 'bg-green-50 text-green-700' : message.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
          {message}
        </p>
      )}

      {searched && tickets.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No members found.</p>
      )}

      {tickets.map(tk => (
        <div key={tk.id} className="bg-white rounded-xl border border-gray-200 p-3 mb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900">{tk.seeker_name}</p>
              <p className="text-xs text-gray-400">
                {tk.title} · {new Date(tk.start_date).toLocaleDateString('en-IN')}
              </p>
              <p className="text-xs text-gray-400">📍 {tk.venue}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {tk.checked_in ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ In</span>
              ) : (
                <button
                  onClick={() => checkinManual(tk)}
                  disabled={checkingIn === tk.id}
                  className="text-xs bg-primary text-white px-3 py-1 rounded-lg font-medium hover:bg-purple-800 disabled:opacity-50">
                  {checkingIn === tk.id ? '…' : 'Check In'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}