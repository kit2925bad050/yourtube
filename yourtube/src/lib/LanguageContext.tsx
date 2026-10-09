"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
];

const translations: Record<string, Record<string, string>> = {
  en: {
    searchPlaceholder: "Search",
    uploadVideo: "Upload Video",
    uploadTitle: "Upload a Video",
    uploadDescription: "Upload, title, and publish your new video.",
    commentPlaceholder: "Add a comment...",
    commentButton: "Comment",
    noComments: "No comments yet. Be the first!",
    cancel: "Cancel",
    showMore: "Show more",
    showLess: "Show less",
  },
  hi: {
    searchPlaceholder: "खोजें",
    uploadVideo: "वीडियो अपलोड करें",
    uploadTitle: "एक वीडियो अपलोड करें",
    uploadDescription: "अपना नया वीडियो अपलोड, शीर्षक और प्रकाशित करें।",
    commentPlaceholder: "एक टिप्पणी जोड़ें...",
    commentButton: "टिप्पणी",
    noComments: "अभी कोई टिप्पणी नहीं। पहला बनें!",
    cancel: "रद्द करें",
    showMore: "और देखें",
    showLess: "कम दिखाएँ",
  },
  ta: {
    searchPlaceholder: "தேடவும்",
    uploadVideo: "வீடியோ பதிவேற்றவும்",
    uploadTitle: "ஒரு வீடியோ பதிவேற்றவும்",
    uploadDescription: "உங்கள் புதிய வீடியோவை பதிவேற்று, தலைப்பு மற்றும் வெளியிடவும்.",
    commentPlaceholder: "ஒரு கருத்தைச் சேர்க்கவும்...",
    commentButton: "கருத்து",
    noComments: "இன்னும் கருத்துக்கள் எதுவும் இல்லை. முதல்வனாயுங்கள்!",
    cancel: "ரத்துசெய்",
    showMore: "மேலும் காண்பி",
    showLess: "குறைவாகக் காண்பி",
  },
  te: {
    searchPlaceholder: "సెర్చ్ చేయండి",
    uploadVideo: "వీడియోను ఎక్కించండి",
    uploadTitle: "ఒక వీడియోని ఎక్కించండి",
    uploadDescription: "మీ కొత్త వీడియోను ఎక్కించి, శీర్షిక పెట్టి ప్రచురించండి.",
    commentPlaceholder: "ఒక కామెంట్ జోడించండి...",
    commentButton: "కామెంట్",
    noComments: "ఇప్పటికే వ్యాఖ్యలు లేవు. మొదటిగా ఉండండి!",
    cancel: "రద్దు చేయండి",
    showMore: "మరింత చూపించు",
    showLess: "తగ్గుగా చూపించు",
  },
  ml: {
    searchPlaceholder: "ശോധിക്കുക",
    uploadVideo: "വീഡിയോ അപ്ലോഡ് ചെയ്യുക",
    uploadTitle: "ഒരു വീഡിയോ അപ്ലോഡ് ചെയ്യുക",
    uploadDescription: "നിങ്ങളുടെ പുതിയ വീഡിയോ അപ്ലോഡ് ചെയ്യുക, തലക്കെട്ട് ചേർക്കുക, പ്രസിദ്ധീകരിക്കുക.",
    commentPlaceholder: "ഒരു കമന്റ് ചേർക്കൂ...",
    commentButton: "കമന്റ്",
    noComments: "ഇപ്പൊഴുള്ളതൊന്നും ഇല്ല. ആദ്യവനാകൂ!",
    cancel: "റദ്ദാക്കുക",
    showMore: "കൂടുതൽ കാണുക",
    showLess: "ഇനിയും കുറച്ചു കാണിക്കുക",
  },
  kn: {
    searchPlaceholder: "ಹುಡುಕಿ",
    uploadVideo: "ವೀಡಿಯೊ ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    uploadTitle: "ವೀಡಿಯೊವನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    uploadDescription: "ನಿಮ್ಮ ಹೊಸ ವೀಡಿಯೊ ಅಪ್ಲೋಡ್ ಮಾಡಿ, ಶೀರ್ಷಿಕೆ ನೀಡಿ ಮತ್ತು ಪ್ರಕಟಿಸಿ.",
    commentPlaceholder: "ಒಂದು ಕಾಮೆಂಟ್ ಸೇರಿಸಿ...",
    commentButton: "ಕಾಮೆಂಟ್",
    noComments: "ಯಾವುದೇ ಕಾಮೆಂಟುಗಳಿಲ್ಲ. ಮೊದಲಾದಿರಿ!",
    cancel: "ರದ್ದುಗೊಳಿಸಿ",
    showMore: "ಇನ್ನಷ್ಟು ನೋಡಿ",
    showLess: "ಕಡಿಮೆ ತೋರಿಸಿ",
  },
};

export type LanguageContextValue = {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string) => string;
  languages: typeof SUPPORTED_LANGUAGES;
};

const defaultValue: LanguageContextValue = {
  locale: "en",
  setLocale: () => {},
  t: (key, fallback) => fallback || key,
  languages: SUPPORTED_LANGUAGES,
};

const LanguageContext = createContext(defaultValue);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("yourtube.language");
    if (stored && SUPPORTED_LANGUAGES.some((item) => item.code === stored)) {
      setLocale(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("yourtube.language", locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string, fallback = key) => {
        return translations[locale]?.[key] || fallback;
      },
      languages: SUPPORTED_LANGUAGES,
    }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
