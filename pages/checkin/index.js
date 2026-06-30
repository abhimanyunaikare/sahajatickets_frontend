import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';

export default function CheckinPage() {
  const router = useRouter();
  const { event_id } = router.query;
  const scannerRef = useRef(null);
  const scannerInstance = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { status, seeker_name, ... }
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('sy_token');
    if (!token) { router.push('/organizer/login?next=/checkin'); return; }
    setAuthed(true);
    if (event_id) fetchStats();
  }, [event_id]);

  const fetchStats = async () => {
    try {
      const r = await api.get(`/events/${event_id}/dashboard`);
      setStats(r.data);
    } catch {}
  };

  const startScanner = async () => {
    setScanning(true);
    setResult(null);

    // Dynamically import html5-qrcode (browser only)
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('qr-reader');
    scannerInstance.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' }, // back camera
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          await processQR(decodedText);
        },
        () => {} // errors during scan are normal
      );
    } catch (err) {
      setScanning(false);
      alert('Camera access denied. Please allow camera permission and try again.');
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
      fetchStats(); // refresh counts
    } catch (err) {
      setResult({
        success: false,
        status: 'error',
        message: err.response?.data?.error || 'Check-in failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const scanAgain = () => {
    setResult(null);
    startScanner();
  };

  if (!authed) return null;

  return (
    <>
      <Navbar />
      <div className="max-w-sm mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-1">🔍 QR Check-in</h1>
        <p className="text-sm text-gray-500 mb-5">Scan seeker's QR code at the entry gate</p>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            <StatCard label="Checked In" value={stats.checked_in_count} color="green" />
            <StatCard label="Total" value={stats.total_tickets} color="purple" />
            <StatCard label="Remaining" value={stats.total_tickets - stats.checked_in_count} color="amber" />
          </div>
        )}

        {/* Scanner area */}
        <div className="card mb-5">
          <div id="qr-reader" className={`w-full rounded-xl overflow-hidden ${scanning ? 'min-h-64' : 'hidden'}`} />

          {!scanning && !result && !loading && (
            <div className="text-center py-10">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-600 font-medium mb-5">Ready to scan tickets</p>
              <button onClick={startScanner} className="btn-primary w-full py-4 text-base">
                Start Scanner
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-10">
              <div className="text-4xl animate-spin mb-3">⟳</div>
              <p className="text-gray-500">Verifying ticket…</p>
            </div>
          )}

          {scanning && (
            <button onClick={stopScanner}
              className="mt-4 w-full text-center text-sm text-red-500 hover:text-red-700 py-2">
              ✕ Cancel scan
            </button>
          )}
        </div>

        {/* Result card */}
        {result && (
          <div className={`card text-center mb-5 ${
            result.status === 'admitted' ? 'bg-green-50 border-green-200' :
            result.status === 'already_used' ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="text-5xl mb-3">
              {result.status === 'admitted' ? '✅' : result.status === 'already_used' ? '⚠️' : '❌'}
            </div>
            <h2 className={`text-xl font-bold mb-1 ${
              result.status === 'admitted' ? 'text-green-700' :
              result.status === 'already_used' ? 'text-amber-700' : 'text-red-700'
            }`}>
              {result.status === 'admitted' ? 'ADMITTED' :
               result.status === 'already_used' ? 'ALREADY CHECKED IN' : 'INVALID TICKET'}
            </h2>

            {result.seeker_name && (
              <div className="mt-3 space-y-1">
                <p className="font-semibold text-gray-800 text-lg">{result.seeker_name}</p>
                {result.age_category && (
                  <span className={`badge-${result.age_category}`}>
                    {result.age_category.charAt(0).toUpperCase() + result.age_category.slice(1)}
                    {result.sex ? ` · ${result.sex === 'male' ? '♂' : '♀'}` : ''}
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

            <button onClick={scanAgain} className="btn-primary w-full mt-5 py-3">
              Scan Next Ticket
            </button>
          </div>
        )}

        {/* Manual lookup */}
        <div className="card bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-2">Can't scan? Manual lookup</p>
          <ManualLookup onResult={setResult} />
        </div>
      </div>
    </>
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

function ManualLookup({ onResult }) {
  const [email, setEmail] = useState('');
  const [tickets, setTickets] = useState([]);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    try {
      const r = await api.get(`/tickets/lookup?email=${email}`);
      setTickets(r.data);
      setSearched(true);
    } catch {}
  };

  return (
    <div>
      <div className="flex gap-2">
        <input className="input flex-1 text-sm !py-2" placeholder="Seeker's email"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()} />
        <button onClick={search} className="btn-primary !px-4 !py-2 text-sm">Find</button>
      </div>
      {searched && tickets.length === 0 && (
        <p className="text-xs text-gray-400 mt-2">No tickets found for this email.</p>
      )}
      {tickets.map(tk => (
        <div key={tk.id} className="mt-2 bg-white rounded-xl border p-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-sm">{tk.seeker_name}</p>
              <p className="text-xs text-gray-400">{tk.title} · {new Date(tk.start_date).toLocaleDateString('en-IN')}</p>
            </div>
            {tk.checked_in
              ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ In</span>
              : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Not yet</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}
