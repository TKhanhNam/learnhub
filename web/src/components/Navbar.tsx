import { FormEvent, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import axiosClient from '../api/axiosClient'
import { GUIDED_LINKS, SUBJECTS } from '../data/subjects'

function chip({ isActive }: { isActive: boolean }) {
  return isActive ? 'nav-chip active' : 'nav-chip'
}

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const vi = locale === 'vi'
  const isAdmin = user?.role === 'ADMIN'

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
      <Link to="/" className="brand">LearnHub</Link>
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
      <form className="nav-search" onSubmit={search} role="search">
        <span className="nav-search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchToday')} />
        <button type="submit">{t('find')}</button>
      </form>

      <div className="nav-actions">
        <div className="nav-group">
          <NavLink to="/business" className={chip}>{t('business')}</NavLink>
          <NavLink to="/help" className={chip}>{t('help')}</NavLink>
        </div>
        {user?.role === 'INSTRUCTOR' && (
          <div className="nav-group">
            <NavLink to="/studio" className={chip}>{t('studio')}</NavLink>
          </div>
        )}
        {user?.role === 'ORG_ADMIN' && (
          <div className="nav-group">
            <NavLink to="/org" className={chip}>L&D</NavLink>
          </div>
        )}
        {isAdmin && (
          <div className="nav-group">
            <NavLink to="/admin" className={chip}>{t('adminPortal')}</NavLink>
          </div>
        )}
        {isAuthenticated && !isAdmin && (
          <div className="nav-group">
            <NavLink to="/cart" className={chip}>{t('cart')}</NavLink>
            <NavLink to="/learning" className={chip}>{t('learning')}</NavLink>
            <NavLink to="/certificates" className={chip}>{t('certs')}</NavLink>
          </div>
        )}
        <div className="nav-group">
          {isAuthenticated ? (
            <>
              <NavLink to="/account" className={chip}>{t('account')}</NavLink>
              <button className="nav-chip" onClick={doLogout}>{t('logout')}</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={chip}>{t('login')}</NavLink>
              <Link to="/register"><button>{t('getLearnHub')}</button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
