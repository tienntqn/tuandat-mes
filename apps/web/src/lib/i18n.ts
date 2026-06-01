import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from '@/i18n/locales/vi.json'
import en from '@/i18n/locales/en.json'

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: localStorage.getItem('language') ?? 'vi',
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
})

export default i18n
