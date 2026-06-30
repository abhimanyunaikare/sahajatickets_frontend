import '../styles/globals.css';
import { createContext, useContext, useState, useEffect } from 'react';
import { LANG, LANG_META } from '../lib/api';

export const LangContext = createContext({ lang: 'en', t: LANG.en, setLang: () => {} });
export const useLang = () => useContext(LangContext);

export default function App({ Component, pageProps }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('sy_lang') || 'en';
    setLangState(saved);
  }, []);

  const setLang = (code) => {
    localStorage.setItem('sy_lang', code);
    setLangState(code);
  };

  const t = LANG[lang] || LANG.en;

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      <Component {...pageProps} />
    </LangContext.Provider>
  );
}
