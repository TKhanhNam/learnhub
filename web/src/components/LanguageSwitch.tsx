import { useI18n } from '../context/I18nContext'

export default function LanguageSwitch() {
  const { locale, setLocale } = useI18n()
  const vi = locale === 'vi'
  return (
    <div className="lang-switch" role="group" aria-label={vi ? 'Ngôn ngữ' : 'Language'}>
      <span className="lang-globe" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 12h18M12 3c2.5 3 3.8 6 3.8 9s-1.3 6-3.8 9c-2.5-3-3.8-6-3.8-9S9.5 6 12 3z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>
      <button type="button" className={locale === 'vi' ? 'on' : ''} onClick={() => setLocale('vi')}>VI</button>
      <button type="button" className={locale === 'en' ? 'on' : ''} onClick={() => setLocale('en')}>EN</button>
    </div>
  )
}
