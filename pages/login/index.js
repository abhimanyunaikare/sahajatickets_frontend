import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { setSeekerSession, getSeekerToken } from '../../lib/api';

const WIDGET_ID = '366644704b44343931313934';
const AUTH_KEY = '546203AIam91cyGf6a43ef23P1';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function SeekerLogin() {
  const router = useRouter();
  const [step, setStep] = useState('phone'); // phone | otp | profile
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (getSeekerToken()) {
      router.push(router.query.next || '/my-tickets');
    }
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const sendOTP = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true); setError('');
    try {
      // Use MSG91's send OTP API directly
      const response = await fetch(
        `https://control.msg91.com/api/v5/otp?template_id=${WIDGET_ID}&mobile=91${cleanPhone}&authkey=${AUTH_KEY}`,
        { method: 'POST' }
      );
      const data = await response.json();
      console.log('MSG91 send:', data);

      if (data.type === 'success' || data.message === 'OTP sent successfully.') {
        setOtpSent(true);
        setStep('otp');
        setResendTimer(30);
      } else {
        // MSG91 may block direct API calls from browser due to CORS
        // Fall back to backend-based sending
        await sendOTPviaBackend(cleanPhone);
      }
    } catch (err) {
      // CORS issue — use backend
      await sendOTPviaBackend(cleanPhone);
    } finally {
      setLoading(false);
    }
  };

  const sendOTPviaBackend = async (cleanPhone) => {
    try {
      await axios.post(`${API_URL}/seeker-auth/send-otp`, { phone: cleanPhone });
      setOtpSent(true);
      setStep('otp');
      setResendTimer(30);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    }
  };

  const verifyOTP = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (otp.length < 4) { setError('Please enter the OTP'); return; }
    setLoading(true); setError('');
    try {
      const r = await axios.post(`${API_URL}/seeker-auth/verify-otp`, {
        phone: cleanPhone,
        otp: otp,
        access_token: otp // send otp as access_token too for MSG91 widget fallback
      });
      setSeekerSession(r.data.token, r.data.account);
      if (r.data.isNewAccount) {
        setStep('profile');
      } else {
        router.push(router.query.next || '/my-tickets');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim()) { setError('Please enter your name'); return; }
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('seeker_token');
      const r = await axios.patch(`${API_URL}/seeker-auth/profile`, profileForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeekerSession(token, r.data);
      router.push(router.query.next || '/my-tickets');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🪷</div>
          <h1 className="text-2xl font-bold text-gray-900">Sahaja Yoga Programs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'phone' && 'Login or Register with your mobile number'}
            {step === 'otp' && `Enter OTP sent to +91 ${phone}`}
            {step === 'profile' && 'Complete your profile'}
          </p>
        </div>

        {/* Step 1 — Phone number */}
        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="label">Mobile Number</label>
              <div className="flex">
                <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl px-3 flex items-center text-sm text-gray-600 font-medium">
                  🇮🇳 +91
                </span>
                <input
                  className="input rounded-l-none"
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  autoFocus
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <button onClick={sendOTP} disabled={loading || phone.length !== 10}
              className="btn-primary w-full py-3 text-base">
              {loading ? 'Sending OTP…' : 'Send OTP →'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              New user? No problem — we'll create your account automatically.
            </p>
          </div>
        )}

        {/* Step 2 — OTP */}
        {step === 'otp' && (
          <div className="space-y-4">
            <div>
              <label className="label">Enter OTP</label>
              <input
                className="input text-center text-2xl tracking-widest font-bold"
                type="number"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={e => { setOtp(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1 text-center">
                {resendTimer > 0
                  ? `Resend OTP in ${resendTimer}s`
                  : <button onClick={() => { setStep('phone'); setOtp(''); setError(''); }} className="text-primary hover:underline">Resend OTP</button>
                }
              </p>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <button onClick={verifyOTP} disabled={loading}
              className="btn-primary w-full py-3 text-base">
              {loading ? 'Verifying…' : 'Verify OTP →'}
            </button>

            <button onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1">
              ← Change number
            </button>
          </div>
        )}

        {/* Step 3 — Profile (new users only) */}
        {step === 'profile' && (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl px-4 py-3 text-center">
              <p className="text-green-700 text-sm font-medium">✓ Phone verified!</p>
              <p className="text-green-600 text-xs mt-0.5">Welcome! Please tell us your name.</p>
            </div>
            <div>
              <label className="label">Your Name *</label>
              <input className="input" placeholder="Full name"
                value={profileForm.name} autoFocus
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" type="email" placeholder="you@example.com"
                value={profileForm.email}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <button onClick={saveProfile} disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}