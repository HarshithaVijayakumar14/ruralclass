import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from './languages';
import enTranslation from './translations/en.json';
import hiTranslation from './translations/hi.json';
import knTranslation from './translations/kn.json';
import taTranslation from './translations/ta.json';
import teTranslation from './translations/te.json';

const savedLanguage = localStorage.getItem('ruralclass_lang') || 'en';

const resources = {
  en: { translation: enTranslation },
  hi: { translation: hiTranslation },
  kn: { translation: knTranslation },
  ta: { translation: taTranslation },
  te: { translation: teTranslation }
};

// Check for cached Sarvam AI bundles in localStorage
SUPPORTED_LANGUAGES.forEach(lang => {
  const cachedBundleJson = localStorage.getItem(`ruralclass_bundle_${lang.code}`);
  if (cachedBundleJson) {
    try {
      const cached = JSON.parse(cachedBundleJson);
      resources[lang.code] = { translation: { ...enTranslation, ...cached } };
    } catch (e) {}
  }

  // Fallback mapping if no bundle yet
  if (!resources[lang.code]) {
    resources[lang.code] = { translation: enTranslation };
  }
});

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Apply document direction and language attribute
const applyDocumentLanguageAttributes = (langCode) => {
  const meta = getLanguageByCode(langCode);
  document.documentElement.lang = langCode;
  document.documentElement.dir = meta.dir || 'ltr';
};

applyDocumentLanguageAttributes(savedLanguage);

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('ruralclass_lang', lng);
  applyDocumentLanguageAttributes(lng);
  window.dispatchEvent(new CustomEvent('ruralclass_language_changed', { detail: { language: lng } }));
});

/**
 * Change App Language and dynamically load Sarvam AI translations
 */
export const changeAppLanguage = async (langCode, onProfileUpdate = null) => {
  // If not yet translated for this language and not in base translations, fetch via Sarvam
  const hasDedicatedTranslation = ['en', 'hi', 'kn', 'ta', 'te'].includes(langCode);

  if (!hasDedicatedTranslation && !localStorage.getItem(`ruralclass_bundle_${langCode}`)) {
    try {
      const res = await fetch('/api/translate/bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle: enTranslation, target_language: langCode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bundle) {
          i18n.addResourceBundle(langCode, 'translation', data.bundle, true, true);
          localStorage.setItem(`ruralclass_bundle_${langCode}`, JSON.stringify(data.bundle));
        }
      }
    } catch (e) {
      console.warn('[Sarvam i18n] Dynamic bundle fetch failed:', e);
    }
  }

  await i18n.changeLanguage(langCode);

  if (onProfileUpdate && typeof onProfileUpdate === 'function') {
    try {
      await onProfileUpdate(langCode);
    } catch (e) {
      console.warn('[i18n] Failed to persist language to backend profile:', e);
    }
  }
};

export default i18n;
