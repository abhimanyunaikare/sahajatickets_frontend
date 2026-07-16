import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { useLang } from '../_app';
import api, { seekerApi, getSeekerToken, getSeekerAccount } from '../../lib/api';
import ZonePicker from '../../components/ZonePicker';

const EMPTY_SEEKER = { name: '', age: '', sex: 'male', zone_city: '', email: '', phone: '', is_first_time: false };

function getCategory(age, tier) {
  if (!age || !tier) return null;
  const a = parseInt(age);
  if (a <= (tier.child_max_age || 12)) return 'child';
  if (a <= (tier.yuva_max_age || 25)) return 'yuva';
  return 'adult';
}

function getPrice(seeker, tier, overrideCat) {
  if (!tier || tier.is_free) return 0;
  const cat = overrideCat || getCategory(seeker.age, tier);
  if (!cat) return 0;
  const sex = seeker.sex === 'female' ? 'female' : 'male';
  const price = parseFloat(tier[`${cat}_${sex}_price`]) || 0;
  return price;
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

  const [seekerAccount, setSeekerAccount] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [categoryOverrides, setCategoryOverrides] = useState({});

  useEffect(() => {
    if (!id) return;
    
    const acct = getSeekerAccount();
    setSeekerAccount(acct);
    const isLoggedIn = !!getSeekerToken();

    if (isLoggedIn) {
      // Logged in — load event + family + profile
      Promise.all([
        api.get(`/events/${id}`),
        seekerApi.get('/family'),
        api.get('/volunteer-options'),
        seekerApi.get('/seeker-auth/profile')
      ]).then(([evRes, famRes, volRes, profileRes]) => {
        setEvent(evRes.data);
        const profile = profileRes.data;
        const selfMember = {
          id: `self_${acct?.id}`,
          _is_self: true,
          name: profile.name || acct?.name || '',
          age: profile.age || null,
          current_age: profile.age || null,
          date_of_birth: profile.date_of_birth || null,
          sex: profile.sex || 'male',
          relation: 'self',
          zone_city: profile.zone_city || '',
          email: profile.email || '',
          phone: profile.phone || acct?.phone || '',
          volunteer_interests: profile.volunteer_interests || []
        };
        setFamilyMembers([selfMember, ...famRes.data]);
        setSeekers([{
          name: selfMember.name,
          age: selfMember.current_age?.toString() || '',
          sex: selfMember.sex || 'male',
          zone_city: selfMember.zone_city || '',
          email: selfMember.email || '',
          phone: selfMember.phone || '',
          _family_id: selfMember.id,
          volunteer_interests: selfMember.volunteer_interests || []
        }]);
      }).finally(() => setLoading(false));
    } else {
      // Guest — load event only, show manual entry form
      Promise.all([
        api.get(`/events/${id}`),
        api.get('/volunteer-options')
      ]).then(([evRes, volRes]) => {
        setEvent(evRes.data);
        setSeekers([{ ...EMPTY_SEEKER, _uid: 'guest_0' }]);
      }).finally(() => setLoading(false));
    }
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

  const addSeeker = () => setSeekers([...seekers, { 
    ...EMPTY_SEEKER, 
    _uid: `manual_${Date.now()}` 
  }]);
  
  const removeSeeker = (i) => setSeekers(seekers.filter((_, idx) => idx !== i));

  const baseTotal = seekers.reduce((sum, s, i) => {
    const override = categoryOverrides[i];
    return sum + getPrice(s, tier, override);
  }, 0);
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
        account_id: seekerAccount?.id,
        seekers: seekers.map((s, i) => ({
          ...s,
          age: parseInt(s.age),
          age_category: categoryOverrides[i] || undefined, // override if set
          category_overridden: !!categoryOverrides[i],
        })),
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
        name: 'Sahaja Yoga Programs',
        description: event.title,
        order_id,
        theme: { color: '#6B21A8' },
        prefill: { name: seekers[0].name, email: seekers[0].email, contact: seekers[0].phone },
        modal: { 
          ondismiss: () => {
            setSubmitting(false);
          },
          confirm_close: false
        },
        
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
    handleSubmit(0); // skip donation for now
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
          {event.start_time && <p className="text-gray-500 text-sm mb-1">🕐 {formatTime(event.start_time)}</p>}          <p className="text-gray-500 text-sm mb-3">📍 {event.venue}{event.city ? `, ${event.city}` : ''}</p>
          {event.description && <p className="text-gray-700 text-sm leading-relaxed">{event.description}</p>}
        </div>

        {step === 'form' && (
          <>
          {/* Guest banner */}
            {!seekerAccount && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-amber-800">Booking as guest</p>
                  <p className="text-xs text-amber-600 mt-0.5">Login to use saved family members & view past coupons</p>
                </div>
                <a href={`/login?next=/events/${id}`}
                  className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-medium whitespace-nowrap shrink-0">
                  Login
                </a>
              </div>
            )}

            {!tier.is_free && (
              <div className="card mb-6 bg-purple-50 border-purple-100">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm">Coupon Pricing</h3>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                {[['child','Child',tier.child_max_age],['yuva','Yuva',tier.yuva_max_age],['adult','Adult','26+']].map(([key,label,maxAge]) => {
                    const malePrice = tier[`${key}_male_price`];
                    const femalePrice = tier[`${key}_female_price`];
                    const samePrice = parseFloat(malePrice) === parseFloat(femalePrice);
                    return (
                      <div key={key} className="bg-white rounded-xl p-3 border border-purple-100">
                        <div className="font-medium text-gray-700">{label}</div>
                        <div className="text-gray-400 text-[10px] mb-2">{key === 'adult' ? 'Age 26+' : `Up to ${maxAge} yrs`}</div>
                        {samePrice ? (
                          <div className="text-primary font-bold text-sm">₹{malePrice}</div>
                        ) : (
                          <>
                            <div className="text-primary font-semibold">♂ ₹{malePrice}</div>
                            <div className="text-purple-400 font-semibold">♀ ₹{femalePrice}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Family member quick-select — collapsible */}
            {familyMembers.length > 0 && (
              <FamilySelector
                familyMembers={familyMembers}
                seekers={seekers}
                setSeekers={setSeekers}
                seekerAccount={seekerAccount}
                onAddNew={addSeeker}
                tier={tier}
                categoryOverrides={categoryOverrides}
                setCategoryOverrides={setCategoryOverrides}
              />
            )}
           {/* Manual entry for seekers NOT from family selector */}
           <div className="mb-6 space-y-5">
              {seekers.map((s, realIndex) => {
                if (s._family_id) return null;
                return (
                  <ManualSeekerForm
                    key={s._uid || `manual_${realIndex}`}
                    seeker={s}
                    index={realIndex}
                    errors={errors}
                    t={t}
                    tier={tier}
                    categoryOverrides={categoryOverrides}
                    setCategoryOverrides={setCategoryOverrides}
                    onUpdate={(field, val) => updateSeeker(realIndex, field, val)}
                    onRemove={() => removeSeeker(realIndex)}
                    showRemove={true}
                    
                    />
                );
              })}
            </div>

            {/* Show manual add button only when needed */}
            {seekers.filter(s => !s._family_id).length > 0 && (
              <button onClick={addSeeker}
                className="w-full py-3 border-2 border-dashed border-purple-300 text-primary rounded-xl text-sm font-medium hover:bg-purple-50 mb-6">
                + Add Member Not in Your List
              </button>
            )}

            
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
              {seekers.map((s, i) => s.name ? (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">
                    {s.name}
                    {categoryOverrides[i] && (
                      <span className="text-xs text-amber-500 ml-1">({categoryOverrides[i]})</span>
                    )}
                  </span>
                  <span>
                    {tier.is_free
                      ? t.free
                      : getPrice(s, tier, categoryOverrides[i]) === 0
                        ? <span className="text-green-600">FREE</span>
                        : `₹${getPrice(s, tier, categoryOverrides[i])}`
                    }
                  </span>
                </div>
              ) : null)}
              {discountAmt > 0 && (
                <div className="flex justify-between text-sm py-1.5 text-green-600">
                  <span>Discount</span><span>- ₹{discountAmt}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-3 text-gray-900">
                <span>Coupon Total</span>
                <span>{tier.is_free || ticketTotal === 0 ? <span className="text-green-600">{t.free}</span> : `₹${ticketTotal}`}</span>
              </div>
            </div>

            <button onClick={handleNextFromForm} disabled={submitting} className="btn-primary w-full text-base py-4">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Processing…
                </span>
              ) : 'Get Coupon →'}
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

// ── Manual Seeker Entry Form ──────────────────────────────────────
function ManualSeekerForm({ seeker: s, index: i, errors, t, tier, categoryOverrides, setCategoryOverrides, onUpdate, onRemove, showRemove }) {
  const getLocalCategory = (age, tier) => {
    if (!age || !tier) return null;
    const a = parseInt(age);
    if (a <= (tier.child_max_age || 12)) return 'child';
    if (a <= (tier.yuva_max_age || 25)) return 'yuva';
    return 'adult';
  };

  const currentCat = categoryOverrides[i] || getLocalCategory(s.age, tier);

  const CATEGORIES = [
    { key: 'child', label: 'Child', emoji: '👶' },
    { key: 'yuva', label: 'Yuva', emoji: '🧑' },
    { key: 'adult', label: 'Adult', emoji: '👤' },
  ];

  const getPrice = (cat, sex, tier) => {
    if (!tier || tier.is_free) return 0;
    return parseFloat(tier[`${cat}_${sex === 'female' ? 'female' : 'male'}_price`] || 0);
  };

  return (
    <div className="card border-2 border-purple-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">Add new member</h3>
        <button type="button" onClick={onRemove}
          className="text-red-400 text-sm hover:text-red-600">✕ Remove</button>
      </div>
      <div className="space-y-4">

        {/* Name */}
        <div>
          <label className="label">{t.yourName} *</label>
          <input
            className={`input ${errors[`${i}_name`] ? 'border-red-400' : ''}`}
            value={s.name}
            onChange={e => onUpdate('name', e.target.value)}
            placeholder="Full name"
            autoComplete="off"
          />
          {errors[`${i}_name`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_name`]}</p>}
        </div>

        {/* Age + Sex */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t.age} *</label>
            <input
              className={`input ${errors[`${i}_age`] ? 'border-red-400' : ''}`}
              type="number" min="1" max="120"
              value={s.age}
              onChange={e => onUpdate('age', e.target.value)}
              placeholder="Age"
            />
            {errors[`${i}_age`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_age`]}</p>}
          </div>
          <div>
            <label className="label">{t.sex} *</label>
            <div className="flex gap-2 mt-1">
              {['male', 'female'].map(sex => (
                <button key={sex} type="button" onClick={() => onUpdate('sex', sex)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all
                    ${s.sex === sex ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                  {sex === 'male' ? '♂ Male' : '♀ Female'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ticket category — card style */}
        {s.age && getLocalCategory(s.age, tier) && (
          <div>
            <label className="label">Coupon Category</label>
            {currentCat !== getLocalCategory(s.age, tier) && (
              <p className="text-xs text-amber-600 mb-1.5">
                ⚡ Changed from default ({getLocalCategory(s.age, tier)})
              </p>
            )}
            <div className="flex gap-2">
              {CATEGORIES.map(cat => {
                const price = getPrice(cat.key, s.sex, tier);
                const isDefault = cat.key === getLocalCategory(s.age, tier);
                const isSelected = cat.key === currentCat;
                return (
                  <button key={cat.key} type="button"
                    onClick={() => setCategoryOverrides(prev => ({
                      ...prev,
                      [i]: cat.key === getLocalCategory(s.age, tier) ? undefined : cat.key
                    }))}
                    className={`flex-1 rounded-xl border-2 py-2 px-1 text-center transition-all
                      ${isSelected ? 'border-primary bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                    <div className="text-xl">{cat.emoji}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                      {cat.label}
                    </div>
                    <div className="text-xs text-gray-400">
                      {tier?.is_free ? 'Free' : `₹${price}`}
                    </div>
                    {isDefault && (
                      <div className="text-[10px] text-green-600 mt-0.5">default</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Zone/City */}
        <div>
          <label className="label">{t.city}</label>
          <ZonePicker
            value={s.zone_city}
            onChange={v => onUpdate('zone_city', v)}
          />
        </div>

        {/* Email */}
        <div>
          <label className="label">{t.email} <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            className="input"
            type="email"
            value={s.email}
            onChange={e => onUpdate('email', e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="label">{t.phone} *</label>
          <div className="flex">
            <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl px-3 flex items-center text-sm text-gray-500">+91</span>
            <input
              className={`input rounded-l-none ${errors[`${i}_phone`] ? 'border-red-400' : ''}`}
              type="tel"
              value={s.phone}
              onChange={e => onUpdate('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit number"
              maxLength={10}
              inputMode="numeric"
            />
          </div>
          {errors[`${i}_phone`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_phone`]}</p>}
        </div>

        {/* Price summary */}
        {s.age && currentCat && (
          <div className="flex justify-between items-center bg-purple-50 rounded-xl px-4 py-2.5">
            <span className="text-sm text-gray-600 capitalize">
              {currentCat} · {s.sex === 'female' ? '♀ Female' : '♂ Male'}
            </span>
            <span className="font-bold text-primary">
              {tier?.is_free
                ? 'FREE'
                : (() => {
                    const p = parseFloat(tier?.[`${currentCat}_${s.sex === 'female' ? 'female' : 'male'}_price`] || 0);
                    return p === 0 ? <span className="text-green-600">FREE</span> : `₹${p}`;
                  })()
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Family Selector with collapsible details ──────────────────────
function FamilySelector({ familyMembers, seekers, setSeekers, seekerAccount, onAddNew, tier, categoryOverrides, setCategoryOverrides }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const isSelected = (m) => seekers.some(s => s.name === m.name && s._family_id === m.id);

  const toggle = (m) => {
    if (isSelected(m)) {
      setSeekers(prev => prev.filter(s => s._family_id !== m.id));
    } else {
      setSeekers(prev => {
        const withoutEmpty = prev.filter(s => s.name.trim());
        return [...withoutEmpty, {
          name: m.name, age: (m.current_age || m.age).toString(), sex: m.sex,
          zone_city: m.zone_city || '', email: m.email || '',
          phone: m.phone || seekerAccount?.phone || '',
          is_first_time: false, _family_id: m.id,
          volunteer_interests: m.volunteer_interests || []
        }];
      });
    }
  };

  return (
    <div className="card mb-5 bg-purple-50 border-purple-100">
      <h3 className="font-semibold text-gray-700 mb-3 text-sm">👨‍👩‍👧 Select family members</h3>
      <div className="space-y-2">
        {familyMembers.map(m => {
          const selected = isSelected(m);
          const seekerIndex = seekers.findIndex(s => s._family_id === m.id);
          const isOpen = expanded[m.id];
          const defaultCat = getCategory(m.age, tier);
          const override = seekerIndex >= 0 ? categoryOverrides[seekerIndex] : null;
          const displayCat = override || defaultCat;

          return (
            <div key={m.id} className={`bg-white rounded-2xl border transition-all ${selected ? 'border-primary shadow-sm' : 'border-gray-200'}`}>
              {/* Header row — always visible */}
              <div className="flex items-center gap-3 px-4 py-3">
                <input type="checkbox" className="w-4 h-4 accent-purple-600 shrink-0"
                  checked={selected} onChange={() => toggle(m)} />
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{m.name}</span>
                    {m._is_self ? (
                      <span className="text-xs bg-purple-100 text-primary px-2 py-0.5 rounded-full font-medium">You</span>
                    ) : (
                      <span className="text-xs text-gray-400 capitalize">{m.relation}</span>
                    )}
                    {selected && tier && (m.current_age || m.age) && (
                      <TicketCategoryPicker
                        age={m.current_age || m.age}
                        tier={tier}
                        sex={m.sex}
                        value={displayCat}
                        onChange={(cat) => {
                          if (seekerIndex >= 0) {
                            setCategoryOverrides(prev => ({ ...prev, [seekerIndex]: cat === defaultCat ? undefined : cat }));
                          }
                        }}
                      />
                    )}
                  </div>
                  {!isOpen && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {m.current_age || m.age
                        ? `Age ${m.current_age || m.age} · `
                        : <span className="text-amber-500">⚠ Add DOB in profile · </span>
                      }
                      {m.sex === 'male' ? '♂ Male' : '♀ Female'}
                      {m.zone_city ? ` · ${m.zone_city}` : ''}
                    </p>
                  )}
                </div>
                <button onClick={() => toggleExpand(m.id)}
                  className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded-lg hover:bg-gray-100 shrink-0">
                  {isOpen ? '▲ Hide' : '▼ Details'}
                </button>
              </div>

              {/* Collapsible details */}
              {isOpen && (
                <div className="px-4 pb-3 border-t border-gray-100 pt-3 space-y-1">
                  <p className="text-xs text-gray-500">
                    Age: {m.current_age || m.age}
                    {m.date_of_birth && (
                      <span className="text-gray-400 ml-1">
                        (DOB: {new Date(m.date_of_birth).toLocaleDateString('en-IN')})
                      </span>
                    )}
                    · {m.sex === 'male' ? '♂ Male' : '♀ Female'}
                  </p>
                  {m.zone_city && <p className="text-xs text-gray-500">📍 {m.zone_city}</p>}
                  {m.phone && <p className="text-xs text-gray-500">📞 {m.phone}</p>}
                  {m.email && <p className="text-xs text-gray-500">✉️ {m.email}</p>}
                  {m.volunteer_interests?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.volunteer_interests.map(i => (
                        <span key={i} className="text-xs bg-purple-100 text-primary px-2 py-0.5 rounded-full">{i}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={onAddNew}
        className="mt-3 text-sm text-primary hover:underline w-full text-left">
        + Add someone not in your list
      </button>
    </div>
  );
}

// ── Ticket Category Picker — card style ───────────────────────────
function TicketCategoryPicker({ age, tier, sex, value, onChange }) {
  const CATEGORIES = [
    { key: 'child', label: 'Child', emoji: '👶', desc: `Up to ${tier?.child_max_age || 12} yrs` },
    { key: 'yuva', label: 'Yuva', emoji: '🧑', desc: `Up to ${tier?.yuva_max_age || 25} yrs` },
    { key: 'adult', label: 'Adult', emoji: '👤', desc: '26+ yrs' },
  ];

  const defaultCat = getCategory(age, tier);
  const isOverridden = value !== defaultCat;

  return (
    <div className="mt-2 w-full">
      {isOverridden && (
        <p className="text-xs text-amber-600 mb-1.5">
          ⚡ Modified from default ({defaultCat})
        </p>
      )}
      <div className="flex gap-1.5">
        {CATEGORIES.map(cat => {
          const price = tier?.is_free ? 0 : parseFloat(tier?.[`${cat.key}_${sex === 'female' ? 'female' : 'male'}_price`] || 0);
          const isDefault = cat.key === defaultCat;
          const isSelected = cat.key === value;

          return (
            <button key={cat.key} type="button" onClick={() => onChange(cat.key)}
              className={`flex-1 rounded-xl border-2 py-2 px-1 text-center transition-all
                ${isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-purple-300'}`}>
              <div className="text-lg">{cat.emoji}</div>
              <div className={`text-xs font-semibold mt-0.5 ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                {cat.label}
              </div>
              <div className="text-xs text-gray-400">
                {tier?.is_free ? 'Free' : `₹${price}`}
              </div>
              {isDefault && (
                <div className="text-[10px] text-green-600 font-medium mt-0.5">default</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DonationStep({ t, ticketTotal, isFree, submitting, onPay }) {
  const [amount, setAmount] = useState(101);
  const [custom, setCustom] = useState('');
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
      </div>

      <div className="card bg-purple-50 border-purple-100">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Coupon amount</span>
          <span>{isFree ? 'FREE' : `₹${ticketTotal}`}</span>
        </div>
        {donationAmt > 0 && (
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Donation 🪷</span>
            <span>₹{donationAmt}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base text-gray-900 border-t border-purple-200 pt-2">
          <span>Total to pay</span>
          <span className="text-primary">{isFree && donationAmt === 0 ? 'FREE' : `₹${isFree ? donationAmt : grandTotal}`}</span>
        </div>
      </div>

      <button onClick={() => onPay(donationAmt)} disabled={submitting} className="btn-primary w-full py-4 text-base">
        {submitting ? 'Processing…' : `Pay ₹${isFree ? donationAmt : grandTotal} →`}
      </button>
      <button onClick={() => onPay(0)} disabled={submitting}
        className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2">
        {t.skip}
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
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify({ uuid: tk.qr_uuid, platform: 'sy-events', venue: event.venue, city: event.city }))}`;

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
      wrapTextCenter(ctx, event.title, 200, 435, 340, 18);

      // Venue
      ctx.fillStyle = '#888888';
      ctx.font = '11px Arial';
      ctx.fillText(`📍 ${event.venue}${event.city ? ', ' + event.city : ''}`, 200, 452);

      // Booking date
      const bookedOn = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '10px Arial';
      ctx.fillText(`Booked on: ${bookedOn}`, 200, 467);

      // Phone
      if (tk.phone) {
        ctx.fillStyle = '#888888';
        ctx.font = '11px Arial';
        ctx.fillText(`📞 +91 ${tk.phone}`, 200, 481);
      }

      // Footer
      ctx.fillStyle = '#B0A0CC';
      ctx.font = '11px Arial';
      ctx.fillText('Jai Shri Mataji 🙏', 200, tk.phone ? 496 : 496);

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

      {tickets.map((tk, i) => {
        const isFreeChild = tk.age_category === 'child' && parseFloat(tk.final_amount || 0) === 0;
        const qrData = JSON.stringify({
          uuid: tk.qr_uuid,
          platform: 'sy-events',
          venue: event.venue,
          city: event.city
        });
        return (
          <div key={i} className="bg-purple-50 border border-purple-100 rounded-2xl p-5 mb-4">
            <p className="font-semibold text-gray-800 text-lg mb-1">{tk.seeker_name}</p>
            <p className="text-xs text-gray-500 mb-1 capitalize">
              {tk.age_category} · {tk.sex === 'male' ? '♂ Male' : '♀ Female'}
            </p>
            <p className="text-xs text-gray-400 mb-1">{event.title}</p>
            <p className="text-xs text-gray-400 mb-4">📍 {event.venue}{event.city ? `, ${event.city}` : ''}</p>

            {isFreeChild ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-center">
                <p className="text-sm text-blue-700 font-medium">👶 Child — Free Entry</p>
                <p className="text-xs text-blue-500 mt-1">No coupon required for children</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
                    alt="Coupon QR Code"
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
                  ⬇ Download Coupon Image
                </button>
              </>
            )}
          </div>
        );
      })}

     <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-2">
        <p className="text-sm text-yellow-800 font-medium">📲 {t.scanQR}</p>
        <p className="text-xs text-yellow-600 mt-1">Screenshot or download the coupon above</p>
      </div>
      {!localStorage.getItem('seeker_token') && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-3">
          <p className="text-sm font-medium text-primary">🔐 Save your coupons for later</p>
          <p className="text-xs text-gray-500 mt-1">Login or register with your mobile number to view all your past coupons anytime.</p>
          <a href="/login" className="btn-primary block text-center mt-3 py-2.5 text-sm">
            Login / Register →
          </a>
        </div>
      )}
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

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const min = m || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${min} ${ampm}`;
}