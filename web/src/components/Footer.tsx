import { Link } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import LanguageSwitch from './LanguageSwitch'

export default function Footer() {
  const { t, locale } = useI18n()
  const vi = locale === 'vi'
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>© LearnHub</p>
        <nav>
          <Link to="/courses">{t('courses')}</Link>
          <Link to="/business">{t('business')}</Link>
          <Link to="/help">{t('help')}</Link>
        </nav>
        <div className="site-footer-lang">
          <span>{vi ? 'Ngôn ngữ' : 'Language'}</span>
          <LanguageSwitch />
        </div>
      </div>
    </footer>
  )
}
