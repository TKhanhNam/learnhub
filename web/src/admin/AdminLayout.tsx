import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import axiosClient from '../api/axiosClient'

const links = [
  { to: '/admin', end: true, vi: 'Tổng quan', en: 'Overview' },
  { to: '/admin/courses', vi: 'Khóa học', en: 'Courses' },
  { to: '/admin/users', vi: 'Tài khoản', en: 'Accounts' },
  { to: '/admin/revenue', vi: 'Doanh thu', en: 'Revenue' },
  { to: '/admin/analytics', vi: 'Phân tích', en: 'Analytics' },
  { to: '/admin/coupons', vi: 'Coupon sàn', en: 'Coupons' },
  { to: '/admin/ai', vi: 'Phí AI', en: 'AI fee' },
  { to: '/admin/business', vi: 'Gói Business', en: 'Business' },
  { to: '/admin/reports', vi: 'Báo cáo Excel', en: 'Excel reports' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { locale } = useI18n()
  const navigate = useNavigate()
  const vi = locale === 'vi'

  const doLogout = async () => {
    try { await axiosClient.post('/api/auth/logout', {}) } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <strong>LearnHub</strong>
          <span>{vi ? 'Cổng quản trị' : 'Admin console'}</span>
        </div>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => isActive ? 'on' : ''}>
              {vi ? link.vi : link.en}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <div>
            <h1>{vi ? 'Quản lý toàn bộ nền tảng' : 'Platform administration'}</h1>
            <p className="muted">{user?.fullName} · {user?.username}</p>
          </div>
          <div className="row">
            <button className="ghost" onClick={() => navigate('/')}>{vi ? 'Xem trang học viên' : 'View learner site'}</button>
            <button className="ghost" onClick={doLogout}>{vi ? 'Đăng xuất' : 'Log out'}</button>
          </div>
        </header>
        <div className="admin-body">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
