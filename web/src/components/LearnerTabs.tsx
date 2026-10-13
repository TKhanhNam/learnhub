import { NavLink } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'

export default function LearnerTabs() {
  const { t } = useI18n()
  return (
    <nav className="learner-tabs" aria-label={t('learning')}>
      <NavLink to="/learning">{t('learning')}</NavLink>
      <NavLink to="/certificates">{t('certs')}</NavLink>
      <NavLink to="/account">{t('account')}</NavLink>
    </nav>
  )
}
