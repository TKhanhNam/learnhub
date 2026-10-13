import { FormEvent, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import axiosClient from '../api/axiosClient'
import { GUIDED_LINKS, SUBJECTS } from '../data/subjects'
import LanguageSwitch from './LanguageSwitch'
import ThemeSwitch from './ThemeSwitch'

function chip({ isActive }: { isActive: boolean }) {
  return isActive ? 'nav-chip active' : 'nav-chip'
}

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [q, setQ] = useState('')
  const vi = locale === 'vi'
  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    if (location.pathname === '/') {
      setQ('')
      return
    }
    if (location.pathname === '/courses') {
      setQ(new URLSearchParams(location.search).get('q') || '')
    }
  }, [location.pathname, location.search])

  const doLogout = async () => {
    try {
      await axiosClient.post('/api/auth/logout', {})
    } catch {
      // ignore
    }
    logout()
    navigate('/')
  }

  const search = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/courses?q=${encodeURIComponent(q.trim())}` : '/courses')
  }

  return (
    <header className="nav">
      <Link to="/" className="brand" onClick={() => setQ('')}>LearnHub</Link>
      <div className="browse-wrap">
        <Link to="/courses" className="browse-btn">{t('courses')}</Link>
        <div className="browse-menu">
          <div>
            <Link to="/courses" className="browse-all">{t('allCourses')} →</Link>
            {SUBJECTS.map((c) => (
              <NavLink key={c.slug} to={`/courses?category=${c.slug}`}>
                {vi ? c.vi : c.en}
              </NavLink>
            ))}
          </div>
          <div>
            <p className="browse-heading">{t('guided')}</p>
            {GUIDED_LINKS.filter((item) => item.to !== '/courses').map((item) => (
              <NavLink key={item.to} to={item.to}>
                {vi ? item.vi : item.en}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
      <form className={`nav-search${q.trim() ? ' has-query' : ''}`} onSubmit={search} role="search">
        <span className="nav-search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchToday')} />
        {!q.trim() && (
          <div className="nav-quick">
            {(vi
              ? [{ label: 'Java', q: 'Java' }, { label: 'Python', q: 'Python' }, { label: 'Giảng viên', q: 'Giang' }]
              : [{ label: 'Java', q: 'Java' }, { label: 'Python', q: 'Python' }, { label: 'Instructor', q: 'Giang' }]
            ).map((hint) => (
              <button
                key={hint.label}
                type="button"
                onClick={() => navigate(`/courses?q=${encodeURIComponent(hint.q)}`)}
              >
                {hint.label}
              </button>
            ))}
          </div>
        )}
        <button type="submit">{t('find')}</button>
      </form>

      <div className="nav-actions">
        <div className="nav-dock">
        {isAuthenticated && !isAdmin && (
          <>
            <NavLink to="/cart" className={chip}>{t('cart')}</NavLink>
            <NavLink to="/learning" className={chip}>{t('learning')}</NavLink>
          </>
        )}
        <div className="nav-more">
          <button type="button" className="nav-chip">{vi ? 'Thêm' : 'More'}</button>
          <div className="nav-more-menu">
            <NavLink to="/favorites">{vi ? 'Yêu thích' : 'Saved'}</NavLink>
            <NavLink to="/orders">{vi ? 'Đơn mua' : 'Orders'}</NavLink>
            <NavLink to="/sell">{vi ? 'Kênh bán' : 'Sell'}</NavLink>
            <NavLink to="/help">{t('help')}</NavLink>
            {user?.role === 'INSTRUCTOR' && <NavLink to="/studio">{t('studio')}</NavLink>}
            {user?.role === 'ORG_ADMIN' && <NavLink to="/org">L&D</NavLink>}
            {isAdmin && <NavLink to="/admin">{t('adminPortal')}</NavLink>}
            {isAuthenticated && !isAdmin && <NavLink to="/certificates">{t('certs')}</NavLink>}
          </div>
        </div>
        {isAuthenticated ? (
          <>
            <NavLink to="/account" className={chip}>{t('account')}</NavLink>
            <button type="button" className="nav-chip" onClick={doLogout}>{t('logout')}</button>
          </>
        ) : (
          <NavLink to="/login" className={chip}>{t('login')}</NavLink>
        )}
        </div>
        {!isAuthenticated && <Link to="/register" className="nav-join"><button>{t('getLearnHub')}</button></Link>}
        <LanguageSwitch />
        <ThemeSwitch />
      </div>
    </header>
  )
}
