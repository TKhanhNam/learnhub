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
import AdminDeskPage from './admin/AdminDeskPage'
import AccountPage from './pages/AccountPage'
import CertificatesPage from './pages/CertificatesPage'
import TermsPage from './pages/TermsPage'
import FavoritesPage from './pages/FavoritesPage'
import OrdersPage from './pages/OrdersPage'
import SellPage from './pages/SellPage'
import PaymentResultPage from './pages/PaymentResultPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import AdminCouponsPage from './admin/AdminCouponsPage'
import AdminBusinessPage from './admin/AdminBusinessPage'
import { useI18n } from './context/I18nContext'
import { useAuth } from './context/AuthContext'
import AiChatWidget from './components/AiChatWidget'
import ChatDock from './components/ChatDock'

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
  const isAuthScreen = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(location.pathname)

  return (
    <>
      {!isAdminApp && !isAuthScreen && <Navbar />}
      <div key={location.pathname} className={isAuthScreen ? 'auth-screen' : undefined}>
        {isAuthScreen && <Link to="/" className="brand auth-brand">LearnHub</Link>}
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shelf" element={<ShelfPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/orders" element={<ProtectedRoute requireVerified><OrdersPage /></ProtectedRoute>} />
          <Route path="/payment/result" element={<PaymentResultPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/market" element={<Navigate to="/courses" replace />} />
          <Route path="/messages" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/business" element={<BusinessPage />} />
          <Route path="/cart" element={<ProtectedRoute requireVerified><CartPage /></ProtectedRoute>} />
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
            <Route path="business" element={<AdminBusinessPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="desk" element={<AdminDeskPage />} />
          </Route>
          <Route path="*" element={user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <NotFound />} />
        </Routes>
      </div>
      {!isAdminApp && !isAuthScreen && <Footer />}
      {!isAuthScreen && <ChatDock />}
      {!isAuthScreen && <AiChatWidget />}
    </>
  )
}
