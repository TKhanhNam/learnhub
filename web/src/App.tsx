import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import ShelfPage from './pages/ShelfPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CoursesPage from './pages/CoursesPage'
import CourseDetailPage from './pages/CourseDetailPage'
import CartPage from './pages/CartPage'
import LearningPage from './pages/LearningPage'
import PlayerPage from './pages/PlayerPage'
import StudioPage from './pages/StudioPage'
import HelpPage from './pages/HelpPage'
import BusinessPage from './pages/BusinessPage'
import OrgPage from './pages/OrgPage'
import AdminLayout from './admin/AdminLayout'
import AdminDashboardPage from './admin/AdminDashboardPage'
import AdminCoursesPage from './admin/AdminCoursesPage'
import AdminUsersPage from './admin/AdminUsersPage'
import AdminRevenuePage from './admin/AdminRevenuePage'
import AdminAnalyticsPage from './admin/AdminAnalyticsPage'
import AdminReportsPage from './admin/AdminReportsPage'
import AccountPage from './pages/AccountPage'
import CertificatesPage from './pages/CertificatesPage'
import AdminAiPage from './admin/AdminAiPage'
import AdminCouponsPage from './admin/AdminCouponsPage'
import AdminBusinessPage from './admin/AdminBusinessPage'
import { useI18n } from './context/I18nContext'
import { useAuth } from './context/AuthContext'

function NotFound() {
  const { t } = useI18n()
  return (
    <div className="page">
      {t('notFound')} <Link to="/">{t('backHome')}</Link>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const { user } = useAuth()
  const isAdminApp = location.pathname.startsWith('/admin')

  return (
    <>
      {!isAdminApp && <Navbar />}
      <div key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shelf" element={<ShelfPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/business" element={<BusinessPage />} />
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/learning" element={<ProtectedRoute><LearningPage /></ProtectedRoute>} />
          <Route path="/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/learn/:courseId" element={<ProtectedRoute><PlayerPage /></ProtectedRoute>} />
          <Route path="/studio" element={<ProtectedRoute roles={['INSTRUCTOR']}><StudioPage /></ProtectedRoute>} />
          <Route path="/org" element={<ProtectedRoute roles={['ORG_ADMIN']}><OrgPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="courses" element={<AdminCoursesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="revenue" element={<AdminRevenuePage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="ai" element={<AdminAiPage />} />
            <Route path="business" element={<AdminBusinessPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
          </Route>
          <Route path="*" element={user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <NotFound />} />
        </Routes>
      </div>
      {!isAdminApp && <Footer />}
    </>
  )
}
