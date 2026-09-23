import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'
import { money } from './adminUtils'
import Scene3D from '../components/Scene3D'

interface UserStats { totalUsers: number; students: number; instructors: number; admins: number; lockedUsers: number }
interface CourseStats { total: number; pending: number; published: number; enrollments: number }
interface Commerce { paidOrders: number; revenue: number; platformFee: number; instructorEarn: number; itemsSold: number }

export default function AdminDashboardPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [users, setUsers] = useState<UserStats | null>(null)
  const [courses, setCourses] = useState<CourseStats | null>(null)
  const [commerce, setCommerce] = useState<Commerce | null>(null)

  useEffect(() => {
    axiosClient.get('/api/users/admin/stats').then((r) => setUsers(r.data.data)).catch(() => {})
    axiosClient.get('/api/catalog/admin/stats').then((r) => setCourses(r.data.data)).catch(() => {})
    axiosClient.get('/api/commerce/admin/analytics').then((r) => setCommerce(r.data.data?.summary)).catch(() => {})
  }, [])

  const cards = [
    { label: vi ? 'Tài khoản' : 'Accounts', value: users?.totalUsers ?? '—', sub: vi ? `${users?.lockedUsers ?? 0} đang khóa` : `${users?.lockedUsers ?? 0} locked` },
    { label: vi ? 'Khóa học' : 'Courses', value: courses?.total ?? '—', sub: vi ? `${courses?.pending ?? 0} chờ duyệt` : `${courses?.pending ?? 0} pending` },
    { label: vi ? 'Doanh thu' : 'Revenue', value: commerce ? money(commerce.revenue) : '—', sub: vi ? `${commerce?.paidOrders ?? 0} đơn đã thanh toán` : `${commerce?.paidOrders ?? 0} paid orders` },
    { label: vi ? 'Phí sàn' : 'Platform fee', value: commerce ? money(commerce.platformFee) : '—', sub: vi ? `Giảng viên nhận ${commerce ? money(commerce.instructorEarn) : '—'}` : `Instructors ${commerce ? money(commerce.instructorEarn) : '—'}` },
  ]

  return (
    <div>
      <div className="admin-hero-3d">
        <Scene3D accent="#2563eb" />
        <div className="admin-hero-copy">
          <p>{vi ? 'Xin chào quản trị viên' : 'Hello, administrator'}</p>
          <small>{vi ? 'Cổng quản trị LearnHub' : 'LearnHub admin console'}</small>
        </div>
      </div>
      <p className="muted">{vi ? 'Đây là cổng riêng của quản trị viên — không dùng giao diện học viên.' : 'This console is separate from the learner website.'}</p>
      <div className="admin-kpis">
        {cards.map((c) => (
          <article key={c.label} className="admin-kpi">
            <span className="muted">{c.label}</span>
            <strong>{c.value}</strong>
            <small>{c.sub}</small>
          </article>
        ))}
      </div>
      <div className="admin-kpis" style={{ marginTop: 16 }}>
        <Link className="admin-kpi" to="/admin/users"><strong>{vi ? 'Quản lý tài khoản' : 'Manage accounts'}</strong><small>{vi ? 'Khóa / mở khóa, gửi email lý do' : 'Lock, unlock, email the reason'}</small></Link>
        <Link className="admin-kpi" to="/admin/courses"><strong>{vi ? 'Quản lý khóa học' : 'Manage courses'}</strong><small>{vi ? 'Duyệt, sửa, ẩn, xóa' : 'Approve, edit, hide, delete'}</small></Link>
        <Link className="admin-kpi" to="/admin/reports"><strong>{vi ? 'Xuất Excel' : 'Export Excel'}</strong><small>{vi ? 'Tài khoản, khóa học, doanh thu' : 'Users, courses, revenue'}</small></Link>
      </div>
    </div>
  )
}
