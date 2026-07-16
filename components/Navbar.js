import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSeekerAccount, clearSeekerSession } from '../lib/api';

function CheckinLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show for admin users logged into the organizer system
    // Never show for seeker OTP users
    const adminUser = localStorage.getItem('sy_user');
    const seekerToken = localStorage.getItem('seeker_token');

    // If they have a seeker token, they are a public user — never show scan QR
    if (seekerToken) { setShow(false); return; }

    if (!adminUser) { setShow(false); return; }
    try {
      const parsed = JSON.parse(adminUser);
      if (['organizer', 'checkin_seva', 'admin'].includes(parsed.role)) {
        setShow(true);
      }
    } catch {}
  }, []);

  if (!show) return null;
  return (
    <Link href="/checkin" className="text-sm text-gray-500 hover:text-primary font-medium">
      📷 Scan QR
    </Link>
  );
}

function SeekerAccountMenu() {
  const [account, setAccount] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { setAccount(getSeekerAccount()); }, []);

  if (!account) {
    return (
      <Link href="/login"
        className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-xl hover:bg-purple-800 transition-all">
        Login
      </Link>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-1.5 hover:bg-gray-50">
        <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
          {(account.name || account.phone)?.[0]?.toUpperCase()}
        </span>
        <span className="hidden sm:block max-w-20 truncate">{account.name || account.phone}</span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-xl p-2 w-48 z-50">
            <div className="px-3 py-2 border-b border-gray-100 mb-1">
              <p className="text-xs font-semibold text-gray-800">{account.name}</p>
              <p className="text-xs text-gray-400">+91 {account.phone}</p>
            </div>
            <Link href="/my-tickets" onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 rounded-lg">
              🎟 My Coupons
            </Link>
            <Link href="/family" onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 rounded-lg">
              👨‍👩‍👧 Family Members
            </Link>
            <Link href="/profile" onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 rounded-lg">
              👤 My Profile
            </Link>
            <hr className="my-1 border-gray-100" />
            <button onClick={() => { clearSeekerSession(); setAccount(null); setOpen(false); window.location.href = '/'; }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🪷</span>
          <span className="font-bold text-primary text-base">SY Programs</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Language switcher — hidden for now
          */}
          <CheckinLink />
          <SeekerAccountMenu />
          <Link href="/organizer/login"
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-xl hidden sm:block">
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}