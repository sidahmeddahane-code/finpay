import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import frTranslations from './locales/fr.json';
import arTranslations from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        translation: frTranslations
      },
      ar: {
        translation: arTranslations
      }
    },
    // Détecte la langue du navigateur, ou utilise 'fr' par défaut
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false // React s'occupe déjà de l'échappement XSS
    }
  });

// Gérer la direction (RTL/LTR) de la page quand la langue change
i18n.on('languageChanged', (lng) => {
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
});

export default i18n;
