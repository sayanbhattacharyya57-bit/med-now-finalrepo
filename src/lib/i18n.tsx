import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "hi" | "pa";

const dict = {
  en: {
    "nav.features": "Features",
    "nav.telemedicine": "Telemedicine",
    "nav.pharmacy": "Pharmacy",
    "nav.ambulance": "Ambulance",
    "nav.assistant": "AI Assistant",
    "nav.login": "Login",
    "nav.signup": "Sign up",
    "nav.dashboard": "Dashboard",
    "nav.logout": "Logout",
    "cta.book": "Book visit",
    "hero.badge": "Built for 2G/3G networks",
    "hero.title.a": "Quality care for",
    "hero.title.b": "every village",
    "hero.title.c": ", every home.",
    "hero.sub": "Doctors, prescriptions and medicine availability for rural and underserved communities — even when the internet is slow or offline.",
    "hero.book": "Book a consultation",
    "hero.sos": "Emergency SOS",
  },
  hi: {
    "nav.features": "विशेषताएँ",
    "nav.telemedicine": "टेलीमेडिसिन",
    "nav.pharmacy": "फार्मेसी",
    "nav.ambulance": "एम्बुलेंस",
    "nav.assistant": "एआई सहायक",
    "nav.login": "लॉगिन",
    "nav.signup": "साइन अप",
    "nav.dashboard": "डैशबोर्ड",
    "nav.logout": "लॉगआउट",
    "cta.book": "अपॉइंटमेंट",
    "hero.badge": "2G/3G नेटवर्क के लिए बनाया गया",
    "hero.title.a": "गुणवत्ता देखभाल —",
    "hero.title.b": "हर गाँव",
    "hero.title.c": ", हर घर के लिए।",
    "hero.sub": "ग्रामीण और वंचित समुदायों के लिए डॉक्टर, दवाइयाँ और रिकॉर्ड — धीमे इंटरनेट पर भी।",
    "hero.book": "परामर्श बुक करें",
    "hero.sos": "आपातकालीन SOS",
  },
  pa: {
    "nav.features": "ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ",
    "nav.telemedicine": "ਟੈਲੀਮੈਡੀਸਨ",
    "nav.pharmacy": "ਫਾਰਮੇਸੀ",
    "nav.ambulance": "ਐਂਬੂਲੈਂਸ",
    "nav.assistant": "AI ਸਹਾਇਕ",
    "nav.login": "ਲੌਗਇਨ",
    "nav.signup": "ਸਾਈਨ ਅੱਪ",
    "nav.dashboard": "ਡੈਸ਼ਬੋਰਡ",
    "nav.logout": "ਲੌਗਆਉਟ",
    "cta.book": "ਮੁਲਾਕਾਤ",
    "hero.badge": "2G/3G ਨੈੱਟਵਰਕ ਲਈ ਬਣਾਇਆ",
    "hero.title.a": "ਗੁਣਵੱਤਾ ਸਿਹਤ —",
    "hero.title.b": "ਹਰ ਪਿੰਡ",
    "hero.title.c": ", ਹਰ ਘਰ ਲਈ।",
    "hero.sub": "ਪੇਂਡੂ ਅਤੇ ਪੱਛੜੇ ਭਾਈਚਾਰਿਆਂ ਲਈ ਡਾਕਟਰ, ਦਵਾਈਆਂ ਅਤੇ ਰਿਕਾਰਡ — ਹੌਲੀ ਇੰਟਰਨੈੱਟ 'ਤੇ ਵੀ।",
    "hero.book": "ਸਲਾਹ ਬੁੱਕ ਕਰੋ",
    "hero.sos": "ਐਮਰਜੈਂਸੀ SOS",
  },
} as const;

type Key = keyof (typeof dict)["en"];

const I18nCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("mednow.lang") as Lang)) || null;
    if (saved) setLang(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("mednow.lang", lang);
  }, [lang]);
  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (k: Key) => (dict[lang] as Record<string, string>)[k] ?? (dict.en as Record<string, string>)[k] ?? k,
    }),
    [lang],
  );
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);

export const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  hi: "हिन्दी",
  pa: "ਪੰਜਾਬੀ",
};