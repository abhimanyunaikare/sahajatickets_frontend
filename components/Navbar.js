import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLang } from '../pages/_app';
import { LANG_META, getSeekerAccount, clearSeekerSession } from '../lib/api';

function SeekerAccountMenu() {
  const [account, setAccount] = useState(null);
  const [open, setOpen] = useState(false);
  const router = typeof window !== 'undefined' ? require('next/router').useRouter() : null;

  useEffect(() => {
    setAccount(getSeekerAccount());
  }, []);

  // Don't show seeker menu on organizer pages
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/organizer')) {
    return null;
  }

  if (!account) {
    return (
      <Link href="/login" className="text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
        Login / Register
      </Link>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
        👤 {account.name || account.phone}
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-44 z-50">
          <Link href="/my-tickets" onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm rounded-lg hover:bg-purple-50 text-gray-700">
            🎟 My Tickets
          </Link>
          <Link href="/family" onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm rounded-lg hover:bg-purple-50 text-gray-700">
            👨‍👩‍👧 Family Members
          </Link>
          <Link href="/profile" onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm rounded-lg hover:bg-purple-50 text-gray-700">
            👤 Profile
          </Link>
          <hr className="my-1 border-gray-100" />
          <button onClick={() => { clearSeekerSession(); setAccount(null); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-red-50 text-red-500">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { lang, setLang } = useLang();
  const [showLang, setShowLang] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🪷</span>
          <span className="font-bold text-primary text-lg">SY Events</span>
        </Link>

        <div className="flex items-center gap-3">
          <SeekerAccountMenu />
          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLang(!showLang)}
              className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              🌐 {LANG_META[lang]}
              <span className="text-gray-400">▾</span>
            </button>
            {showLang && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-44 z-50">
                {Object.entries(LANG_META).map(([code, label]) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); setShowLang(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-purple-50 hover:text-primary ${lang === code ? 'bg-purple-50 text-primary font-medium' : 'text-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link href="/checkin" className="text-sm text-gray-500 hover:text-primary">
            Scan QR
          </Link>
          <Link href="/organizer/login" className="btn-primary !px-4 !py-2 text-sm">
            Organizer Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
