import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

// Attach JWT token automatically
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sy_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Language strings for all supported languages
export const LANG = {
  en: {
    name: 'English', native: 'English',
    yourName: 'Your name', age: 'Age', sex: 'Sex', city: 'City / Zone',
    email: 'Email', phone: 'WhatsApp number',
    male: 'Male', female: 'Female',
    child: 'Child', yuva: 'Yuva', adult: 'Adult',
    firstTime: 'First-time seeker?',
    addSeeker: '+ Add another seeker',
    discountCode: 'Have a discount code?',
    enterCode: 'Enter code',
    apply: 'Apply',
    proceedPay: 'Proceed to Payment',
    greeting: 'Jai Shri Mataji 🙏',
    ticketReady: 'Your coupon is confirmed!',
    scanQR: 'Show this QR at entry',
    donate: 'Donation',
    donateSubtitle: 'Your coupon is confirmed. Add a donation if you wish — fully optional.',
    skip: 'Skip donation',
    free: 'FREE',
    getTicket: 'Get Coupon',
  },
  hi: {
    name: 'हिंदी', native: 'हिंदी',
    yourName: 'आपका नाम', age: 'आयु', sex: 'लिंग', city: 'शहर / क्षेत्र',
    email: 'ईमेल', phone: 'WhatsApp नंबर',
    male: 'पुरुष', female: 'महिला',
    child: 'बाल', yuva: 'युवा', adult: 'वयस्क',
    firstTime: 'क्या आप पहली बार आ रहे हैं?',
    addSeeker: '+ एक और साधक जोड़ें',
    discountCode: 'डिस्काउंट कोड है?',
    enterCode: 'कोड दर्ज करें',
    apply: 'लागू करें',
    proceedPay: 'भुगतान करें',
    greeting: 'जय श्री माताजी 🙏',
    ticketReady: 'आपका टिकट तैयार है!',
    scanQR: 'प्रवेश पर यह QR दिखाएं',
    donate: 'दान करें',
    donateSubtitle: 'आपका टिकट पक्का है। यदि चाहें तो कोई भी राशि अर्पित करें।',
    skip: 'अभी नहीं',
    dedicate: 'किसी के नाम पर अर्पित करें',
    anonymous: 'गुमनाम रहें',
    free: 'निःशुल्क',
  },
  mr: {
    name: 'मराठी', native: 'मराठी',
    yourName: 'आपले नाव', age: 'वय', sex: 'लिंग', city: 'शहर / क्षेत्र',
    email: 'ईमेल', phone: 'WhatsApp क्रमांक',
    male: 'पुरुष', female: 'स्त्री',
    child: 'बाल', yuva: 'युवा', adult: 'प्रौढ',
    firstTime: 'पहिल्यांदा येत आहात का?',
    addSeeker: '+ आणखी एक साधक जोडा',
    discountCode: 'सवलत कोड आहे का?',
    enterCode: 'कोड टाका',
    apply: 'लागू करा',
    proceedPay: 'पेमेंट करा',
    greeting: 'जय श्री माताजी 🙏',
    ticketReady: 'तुमचे तिकीट तयार आहे!',
    scanQR: 'प्रवेशद्वारावर हा QR दाखवा',
    donate: 'दान करा',
    donateSubtitle: 'तुमचे तिकीट निश्चित झाले आहे. इच्छा असल्यास दान करा।',
    skip: 'आत्ता नको',
    dedicate: 'कुणाच्या नावाने अर्पित करा',
    anonymous: 'अनामिक राहा',
    free: 'मोफत',
  },
};

export const SUPPORTED_LANGS = ['en','hi','mr','gu','ta','te','kn','bn','pa'];

export const LANG_META = {
  en: 'English', hi: 'हिंदी', mr: 'मराठी',
  gu: 'ગુજરાતી', ta: 'தமிழ்', te: 'తెలుగు',
  kn: 'ಕನ್ನಡ', bn: 'বাংলা', pa: 'ਪੰਜਾਬੀ'
};

export function useLang() {
  if (typeof window === 'undefined') return LANG.en;
  const code = localStorage.getItem('sy_lang') || 'en';
  return LANG[code] || LANG.en;
}

// Seeker auth helpers
export const seekerApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

seekerApi.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('seeker_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getSeekerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('seeker_token');
}

export function getSeekerAccount() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('seeker_account')); } catch { return null; }
}

export function setSeekerSession(token, account) {
  localStorage.setItem('seeker_token', token);
  localStorage.setItem('seeker_account', JSON.stringify(account));
}

export function clearSeekerSession() {
  localStorage.removeItem('seeker_token');
  localStorage.removeItem('seeker_account');
}

export default api;
