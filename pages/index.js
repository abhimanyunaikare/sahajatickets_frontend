import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useLang } from './_app';
import api from '../lib/api';

export default function Home() {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/events')
      .then(r => setEvents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 text-white">
        {/* Shri Mataji Photo */}
        <div className="flex justify-center pt-8 pb-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-yellow-300/20 blur-xl scale-110" />
            <img
              src="/shrimataji.webp"
              alt="H. H. Shri Mataji Nirmala Devi"
              className="relative w-40 h-40 sm:w-52 sm:h-52 object-cover object-top rounded-full border-4 border-yellow-300/60 shadow-2xl"
            />
          </div>
        </div>
        <div className="text-center px-4 pb-10 pt-4">
          <p className="text-yellow-200 text-xs font-medium tracking-widest uppercase mb-2">
            H. H. Shri Mataji Nirmala Devi
          </p>
          <h1 className="text-3xl font-bold mb-2">Sahaja Yoga Programs</h1>
          <p className="text-purple-200 text-lg">Registration for pujas, workshops & seminars</p>
          <p className="mt-3 text-lg font-medium text-yellow-300">Jai Shri Mataji 🙏</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-6">Upcoming programs</h2>

        {loading && (
          <div className="text-center text-gray-400 py-16">Loading programs…</div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center card py-16">
            <div className="text-5xl mb-4">🪷</div>
            <p className="text-gray-500">No upcoming events at the moment.</p>
            <p className="text-gray-400 text-sm mt-1">Check back soon.</p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </>
  );
}


function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const min = m || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${min} ${ampm}`;
}

function EventCard({ event }) {
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  const multiDay = event.start_date !== event.end_date;
  const dateStr = multiDay
    ? `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : start.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const minPrice = Math.min(
    event.adult_male_price || 0,
    event.adult_female_price || 0,
    event.yuva_male_price || 0,
    event.yuva_female_price || 0
  );

  return (
    <Link href={`/events/${event.id}`}>
      <div className="card hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group">
        {event.banner_url && (
          <img src={event.banner_url} alt={event.title}
            className="w-full h-40 object-cover rounded-xl mb-4" />
        )}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary text-lg leading-tight">
            {event.title}
          </h3>
          {event.is_free && (
            <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
              FREE
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">📅 {dateStr}</p>
        {event.start_time && (
          <p className="text-sm text-gray-500 mt-0.5">
            🕐 {formatTime(event.start_time)}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-1">📍 {event.venue}{event.city ? `, ${event.city}` : ''}</p>
        {multiDay && (
          <span className="inline-block mt-3 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-0.5">
            Multi-day programme
          </span>
        )}
        <div className="mt-4 text-sm font-medium text-primary group-hover:underline">
        Get Coupon →
        </div>
      </div>
    </Link>
  );
}
