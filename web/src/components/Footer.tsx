import { Link } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'

export default function Footer() {
  const { t, locale } = useI18n()
  const vi = locale === 'vi'
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>© LearnHub</p>
        <nav>
          <Link to="/courses">{t('courses')}</Link>
          <Link to="/help">{t('help')}</Link>
          <Link to="/terms">{vi ? 'Điều khoản' : 'Terms'}</Link>
        </nav>
      </div>
    </footer>
  )
}
