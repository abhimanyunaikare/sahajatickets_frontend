import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { useLang } from '../_app';
import api from '../../lib/api';

const EMPTY_SEEKER = { name: '', age: '', sex: 'male', zone_city: '', email: '', phone: '', is_first_time: false };

function getCategory(age, tier) {
  if (!age || !tier) return null;
  const a = parseInt(age);
  if (a <= (tier.child_max_age || 12)) return 'child';
  if (a <= (tier.yuva_max_age || 25)) return 'yuva';
  return 'adult';
}

function getPrice(seeker, tier) {
  if (!tier || tier.is_free) return 0;
  const cat = getCategory(seeker.age, tier);
  if (!cat) return 0;
  const sex = seeker.sex === 'female' ? 'female' : 'male';
  return parseFloat(tier[`${cat}_${sex}_price`]) || 0;
}

export default function EventPage() {
  const router = useRouter();
  const { id } = router.query;
  const { t, lang } = useLang();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seekers, setSeekers] = useState([{ ...EMPTY_SEEKER }]);
  const [discountCode, setDiscountCode] = useState('');
  const [discountResult, setDiscountResult] = useState(null);
  const [step, setStep] = useState('form'); // form | donation | success
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [errors, setErrors] = useState({});
  const [donationAmount, setDonationAmount] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.get(`/events/${id}`).then(r => setEvent(r.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  const tier = event;

  const updateSeeker = (i, field, val) => {
    const updated = [...seekers];
    updated[i] = { ...updated[i], [field]: val };
    setSeekers(updated);
    setErrors(e => ({ ...e, [`${i}_${field}`]: undefined }));
  };

  const addSeeker = () => setSeekers([...seekers, { ...EMPTY_SEEKER }]);
  const removeSeeker = (i) => setSeekers(seekers.filter((_, idx) => idx !== i));

  const baseTotal = seekers.reduce((sum, s) => sum + getPrice(s, tier), 0);
  const discountAmt = discountResult?.valid ? (discountResult.discountAmount || 0) : 0;
  const ticketTotal = Math.max(0, baseTotal - discountAmt);

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    try {
      const r = await api.post('/tickets/calculate', { event_id: id, seekers, discount_code: discountCode });
      setDiscountResult(r.data.discountInfo);
    } catch { setDiscountResult({ valid: false, message: 'Could not apply code' }); }
  };

  const validate = () => {
    const errs = {};
    seekers.forEach((s, i) => {
      if (!s.name.trim()) errs[`${i}_name`] = 'Required';
      if (!s.age || s.age < 1 || s.age > 120) errs[`${i}_age`] = 'Valid age required';
      if (!s.phone || s.phone.trim().length < 10) errs[`${i}_phone`] = 'Valid 10-digit phone required';
      if (s.email && !s.email.includes('@')) errs[`${i}_email`] = 'Invalid email format';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (donationAmt = 0) => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const grandTotal = ticketTotal + donationAmt;
      const payload = {
        event_id: id,
        seekers: seekers.map(s => ({ ...s, age: parseInt(s.age) })),
        discount_code: discountCode || undefined,
        language: lang,
        donation_amount: donationAmt
      };

      const orderRes = await api.post('/tickets/order', payload);

      if (orderRes.data.free) {
        setTickets(orderRes.data.tickets);
        setStep('success');
        return;
      }

      const { order_id, key_id, booking_group_id } = orderRes.data;
      const options = {
        key: key_id,
        amount: orderRes.data.amount,
        currency: 'INR',
        name: 'Sahaja Yoga Events',
        description: event.title,
        order_id,
        theme: { color: '#6B21A8' },
        prefill: { name: seekers[0].name, email: seekers[0].email, contact: seekers[0].phone },
        modal: { ondismiss: () => setSubmitting(false) },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/tickets/verify', { ...response, booking_group_id });
            setTickets(verifyRes.data.tickets);
            setStep('success');
          } catch {
            alert('Payment done but ticket generation failed. Contact organiser with booking ID: ' + booking_group_id);
            setSubmitting(false);
          }
        }
      };
      const rp = new window.Razorpay(options);
      rp.open();
    } catch (err) {
      alert(err.response?.data?.error || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const handleNextFromForm = () => {
    if (!validate()) return;
    if (event.donation_enabled === false) {
      handleSubmit(0); // skip donation step entirely, go straight to payment
    } else {
      setStep('donation');
    }
  };

  if (loading) return <><Navbar /><div className="text-center py-20 text-gray-400">Loading…</div></>;
  if (!event) return <><Navbar /><div className="text-center py-20 text-gray-500">Event not found.</div></>;

  if (event.status === 'draft') {
    return (
      <>
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-4">🚧</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{event.title}</h2>
          <p className="text-gray-500">This event is not yet open for registration.</p>
          <p className="text-gray-400 text-sm mt-1">Please check back later.</p>
        </div>
      </>
    );
  }

  if (event.status === 'closed') {
    return (
      <>
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{event.title}</h2>
          <p className="text-gray-500">Registrations for this event have closed.</p>
          <p className="text-gray-400 text-sm mt-1">Payments are no longer being accepted for this event.</p>
        </div>
      </>
    );
  }

  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  const multiDay = event.start_date !== event.end_date;

  return (
    <>
      <Navbar />
      <div className={`${event.banner_url ? '' : 'bg-gradient-to-br from-purple-900 to-purple-600'} relative`}>
        {event.banner_url
          ? <img src={event.banner_url} alt={event.title} className="w-full h-52 object-cover" />
          : <div className="py-12 text-center text-white"><div className="text-5xl mb-2">🪷</div></div>}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{event.title}</h1>
          <p className="text-gray-500 text-sm mb-1">
            📅 {multiDay
              ? `${start.toLocaleDateString('en-IN', { day:'numeric', month:'short' })} – ${end.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}`
              : start.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
          {event.start_time && <p className="text-gray-500 text-sm mb-1">🕐 {event.start_time}</p>}
          <p className="text-gray-500 text-sm mb-3">📍 {event.venue}{event.city ? `, ${event.city}` : ''}</p>
          {event.description && <p className="text-gray-700 text-sm leading-relaxed">{event.description}</p>}
        </div>

        {step === 'form' && (
          <>
            {!tier.is_free && (
              <div className="card mb-6 bg-purple-50 border-purple-100">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm">Ticket Pricing</h3>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  {[['child','Child',tier.child_max_age],['yuva','Yuva',tier.yuva_max_age],['adult','Adult','26+']].map(([key,label,maxAge]) => (
                    <div key={key} className="bg-white rounded-xl p-3 border border-purple-100">
                      <div className="font-medium text-gray-700">{label}</div>
                      <div className="text-gray-400 text-[10px] mb-2">{key === 'adult' ? 'Age 26+' : `Up to ${maxAge} yrs`}</div>
                      <div className="text-primary font-semibold">♂ ₹{tier[`${key}_male_price`]}</div>
                      <div className="text-purple-400 font-semibold">♀ ₹{tier[`${key}_female_price`]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6 space-y-5">
              {seekers.map((s, i) => (
                <div key={i} className="card border-2 border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700">{seekers.length > 1 ? `Seeker ${i + 1}` : 'Your details'}</h3>
                    {i > 0 && <button onClick={() => removeSeeker(i)} className="text-red-400 text-sm hover:text-red-600">Remove</button>}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="label">{t.yourName} *</label>
                      <input className={`input ${errors[`${i}_name`] ? 'border-red-400' : ''}`}
                        value={s.name} onChange={e => updateSeeker(i, 'name', e.target.value)} placeholder="Full name" />
                      {errors[`${i}_name`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_name`]}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">{t.age} *</label>
                        <input className={`input ${errors[`${i}_age`] ? 'border-red-400' : ''}`}
                          type="number" min="1" max="120"
                          value={s.age} onChange={e => updateSeeker(i, 'age', e.target.value)} placeholder="Age" />
                        {s.age && getCategory(s.age, tier) && (
                          <span className={`mt-1 inline-block badge-${getCategory(s.age, tier)}`}>
                            {t[getCategory(s.age, tier)]}
                          </span>
                        )}
                        {errors[`${i}_age`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_age`]}</p>}
                      </div>
                      <div>
                        <label className="label">{t.sex} *</label>
                        <div className="flex gap-2 mt-1">
                          {['male','female'].map(sex => (
                            <button key={sex} onClick={() => updateSeeker(i, 'sex', sex)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all
                                ${s.sex === sex ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                              {sex === 'male' ? `♂ ${t.male}` : `♀ ${t.female}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="label">{t.city}</label>
                      <input className="input" value={s.zone_city}
                        onChange={e => updateSeeker(i, 'zone_city', e.target.value)} placeholder="City or zone name" />
                    </div>
                    <div>
                      <label className="label">{t.email} <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input className="input"
                        type="email" value={s.email}
                        onChange={e => updateSeeker(i, 'email', e.target.value)} placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="label">{t.phone} *</label>
                      <div className="flex">
                        <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl px-3 flex items-center text-sm text-gray-500">+91</span>
                        <input className={`input rounded-l-none ${errors[`${i}_phone`] ? 'border-red-400' : ''}`} type="tel" value={s.phone}
                          onChange={e => updateSeeker(i, 'phone', e.target.value)} placeholder="10-digit number" />
                      </div>
                      {errors[`${i}_phone`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_phone`]}</p>}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-purple-600"
                        checked={s.is_first_time} onChange={e => updateSeeker(i, 'is_first_time', e.target.checked)} />
                      <span className="text-sm text-gray-600">{t.firstTime}</span>
                    </label>
                    {s.age && (
                      <div className="flex justify-between items-center bg-purple-50 rounded-xl px-4 py-2">
                        <span className="text-sm text-gray-600">{t[getCategory(s.age, tier)] || ''} ({s.sex === 'female' ? '♀' : '♂'})</span>
                        <span className="font-semibold text-primary">{tier.is_free ? t.free : `₹${getPrice(s, tier)}`}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addSeeker}
              className="w-full py-3 border-2 border-dashed border-purple-300 text-primary rounded-xl text-sm font-medium hover:bg-purple-50 mb-6">
              {t.addSeeker}
            </button>

            {event.discount_enabled && (
              <div className="card mb-6">
                <label className="label">{t.discountCode}</label>
                <div className="flex gap-2">
                  <input className="input flex-1" value={discountCode}
                    onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountResult(null); }}
                    placeholder={t.enterCode} />
                  <button onClick={applyDiscount} className="btn-outline !px-5 !py-2 text-sm">{t.apply}</button>
                </div>
                {discountResult && (
                  <p className={`text-sm mt-2 font-medium ${discountResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                    {discountResult.valid ? `✓ ₹${discountResult.discountAmount} off applied!` : `✗ ${discountResult.message}`}
                  </p>
                )}
              </div>
            )}

            <div className="card mb-6 bg-gray-50">
              <h3 className="font-semibold text-gray-700 mb-3">Order Summary</h3>
              {seekers.map((s, i) => s.age ? (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">{s.name || `Seeker ${i+1}`}</span>
                  <span>{tier.is_free ? t.free : `₹${getPrice(s, tier)}`}</span>
                </div>
              ) : null)}
              {discountAmt > 0 && (
                <div className="flex justify-between text-sm py-1.5 text-green-600">
                  <span>Discount</span><span>- ₹{discountAmt}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-3 text-gray-900">
                <span>Ticket Total</span>
                <span>{tier.is_free || ticketTotal === 0 ? <span className="text-green-600">{t.free}</span> : `₹${ticketTotal}`}</span>
              </div>
            </div>

            <button onClick={handleNextFromForm} className="btn-primary w-full text-base py-4">
              Next — Add Dana →
            </button>
          </>
        )}

        {step === 'donation' && (
          event.donation_enabled !== false ? (
            <DonationStep
              t={t}
              ticketTotal={ticketTotal}
              isFree={tier.is_free || ticketTotal === 0}
              submitting={submitting}
              onPay={(donationAmt) => handleSubmit(donationAmt)}
            />
          ) : (
            // Donation disabled for this event — skip straight to payment
            <SkipDonationConfirm
              ticketTotal={ticketTotal}
              isFree={tier.is_free || ticketTotal === 0}
              submitting={submitting}
              onPay={() => handleSubmit(0)}
            />
          )
        )}

        {step === 'success' && (
          <SuccessStep tickets={tickets} t={t} event={event} />
        )}
      </div>
    </>
  );
}

function DonationStep({ t, ticketTotal, isFree, submitting, onPay }) {
  const [amount, setAmount] = useState(101);
  const [custom, setCustom] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [dedication, setDedication] = useState('');
  const [showDedicate, setShowDedicate] = useState(false);
  const PRESETS = [51, 101, 251, 501];
  const donationAmt = custom ? parseInt(custom) || 0 : amount;
  const grandTotal = ticketTotal + donationAmt;

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🙏</div>
          <h2 className="text-xl font-bold text-gray-800">{t.donate}</h2>
          <p className="text-gray-500 text-sm mt-1">{t.donateSubtitle}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map(p => (
            <button key={p} onClick={() => { setAmount(p); setCustom(''); }}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all
                ${amount === p && !custom ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-700 hover:border-primary'}`}>
              ₹{p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-gray-400 text-lg">₹</span>
          <input className="input" type="number" min="1" placeholder="Any other amount"
            value={custom} onChange={e => { setCustom(e.target.value); setAmount(0); }} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input type="checkbox" className="w-4 h-4 accent-purple-600"
            checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
          <span className="text-sm text-gray-600">{t.anonymous}</span>
        </label>

        {!showDedicate ? (
          <button onClick={() => setShowDedicate(true)}
            className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 text-sm text-gray-500 hover:bg-gray-50 mb-2">
            🪷 {t.dedicate}
          </button>
        ) : (
          <input className="input mb-2" placeholder="e.g. In memory of my mother..."
            value={dedication} onChange={e => setDedication(e.target.value)} />
        )}
      </div>

      <div className="card bg-purple-50 border-purple-100">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Ticket amount</span>
          <span>{isFree ? 'FREE' : `₹${ticketTotal}`}</span>
        </div>
        {donationAmt > 0 && (
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Dana (donation) 🪷</span>
            <span>₹{donationAmt}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base text-gray-900 border-t border-purple-200 pt-2">
          <span>Total to pay</span>
          <span className="text-primary">{isFree && donationAmt === 0 ? 'FREE' : `₹${isFree ? donationAmt : grandTotal}`}</span>
        </div>
      </div>

      <button onClick={() => onPay(donationAmt)} disabled={submitting}
        className="btn-primary w-full py-4 text-base">
        {submitting ? 'Processing…' : (isFree && donationAmt === 0 ? '✓ Confirm Registration' : `Pay ₹${isFree ? donationAmt : grandTotal} →`)}
      </button>
      <button onClick={() => onPay(0)} disabled={submitting}
        className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2">
        {t.skip} — Pay ₹{ticketTotal} only
      </button>
    </div>
  );
}

function SkipDonationConfirm({ ticketTotal, isFree, submitting, onPay }) {
  return (
    <div className="card text-center">
      <div className="text-4xl mb-3">🎟️</div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Confirm your registration</h2>
      <p className="text-gray-500 text-sm mb-5">{isFree ? 'This is a free event.' : `Total amount: ₹${ticketTotal}`}</p>
      <button onClick={onPay} disabled={submitting} className="btn-primary w-full py-4 text-base">
        {submitting ? 'Processing…' : (isFree ? '✓ Confirm Registration' : `Pay ₹${ticketTotal} →`)}
      </button>
    </div>
  );
}

function SuccessStep({ tickets, t, event }) {
  const downloadTicket = (tk) => {
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify({ uuid: tk.qr_uuid, platform: 'sy-events' }))}`;

    qrImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 520;
      const ctx = canvas.getContext('2d');

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 520);

      // QR code centered at top
      ctx.drawImage(qrImg, 50, 30, 300, 300);

      // Thin divider
      ctx.strokeStyle = '#E2D9F3';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 350);
      ctx.lineTo(360, 350);
      ctx.stroke();

      // Text below QR
      ctx.textAlign = 'center';

      // Name
      ctx.fillStyle = '#1F0A3C';
      ctx.font = 'bold 22px Arial';
      ctx.fillText(tk.seeker_name, 200, 385);

      // Age category + sex
      ctx.fillStyle = '#6B21A8';
      ctx.font = '15px Arial';
      const sexLabel = tk.sex === 'male' ? '♂ Male' : '♀ Female';
      const catLabel = capitalize(tk.age_category);
      ctx.fillText(`${catLabel} · ${sexLabel}`, 200, 412);

      // Event name
      ctx.fillStyle = '#555555';
      ctx.font = '13px Arial';
      wrapTextCenter(ctx, event.title, 200, 440, 340, 18);

      // Phone
      if (tk.phone) {
        ctx.fillStyle = '#888888';
        ctx.font = '12px Arial';
        ctx.fillText(`📞 +91 ${tk.phone}`, 200, 468);
      }

      // Footer
      ctx.fillStyle = '#B0A0CC';
      ctx.font = '11px Arial';
      ctx.fillText('Jai Shri Mataji 🙏', 200, tk.phone ? 492 : 505);

      // Download
      const link = document.createElement('a');
      link.download = `ticket-${tk.seeker_name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  return (
    <div className="card text-center">
      <div className="text-5xl mb-3">✅</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{t.ticketReady}</h2>
      <p className="text-purple-600 font-medium mb-1">{t.greeting}</p>
      <p className="text-sm text-gray-400 mb-6">QR also sent to your email and WhatsApp</p>

      {tickets.map((tk, i) => (
        <div key={i} className="bg-purple-50 border border-purple-100 rounded-2xl p-5 mb-4">
          <p className="font-semibold text-gray-800 text-lg mb-1">{tk.seeker_name}</p>
          <p className="text-xs text-gray-500 mb-1 capitalize">{tk.age_category} · {tk.sex === 'male' ? '♂ Male' : '♀ Female'}</p>
          <p className="text-xs text-gray-400 mb-4">{event.title}</p>

          <div className="flex justify-center mb-3">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify({ uuid: tk.qr_uuid, platform: 'sy-events' }))}`}
              alt="Ticket QR Code"
              className="w-48 h-48 rounded-xl border-4 border-white shadow-md"
            />
          </div>

          <p className="text-xs text-gray-400 font-mono bg-white rounded-lg px-3 py-2 break-all mb-4">
            {tk.qr_uuid}
          </p>

          <button
            onClick={() => downloadTicket(tk)}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-800 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            ⬇ Download Ticket Image
          </button>
        </div>
      ))}

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-2">
        <p className="text-sm text-yellow-800 font-medium">📲 {t.scanQR}</p>
        <p className="text-xs text-yellow-600 mt-1">Screenshot or download the ticket above</p>
      </div>
    </div>
  );
}

// ── Canvas helpers ────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectTop(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapTextCenter(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(start, end) {
  const s = new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  if (!end || start === end) return s;
  const e = new Date(end).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${s} – ${e}`;
}