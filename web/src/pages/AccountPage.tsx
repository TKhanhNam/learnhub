import { FormEvent, useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import LanguageSwitch from '../components/LanguageSwitch'
import LearnerTabs from '../components/LearnerTabs'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'

function roleLabel(role: string | undefined, vi: boolean) {
  if (role === 'ADMIN') return vi ? 'Quản trị viên' : 'Administrator'
  if (role === 'INSTRUCTOR') return vi ? 'Giảng viên' : 'Instructor'
  if (role === 'ORG_ADMIN') return vi ? 'Quản trị doanh nghiệp' : 'Organization admin'
  return vi ? 'Học viên' : 'Learner'
}

export default function AccountPage() {
  const { user, login } = useAuth()
  const { locale, setLocale } = useI18n()
  const vi = locale === 'vi'
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nextEmail, setNextEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [verified, setVerified] = useState(false)
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null)

  useEffect(() => {
    axiosClient.get('/api/users/me').then((res) => {
      const d = res.data.data
      setFullName(d.fullName || '')
      setHeadline(d.headline || '')
      setBio(d.bio || '')
      if (d.language === 'vi' || d.language === 'en') setLocale(d.language)
      setEmail(d.email || '')
      setPhone(d.phone || '')
      setNextEmail(d.email || '')
      setVerified(!!d.emailVerified)
    }).catch(() => {})
  }, [setLocale])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const res = await axiosClient.put('/api/users/me', { fullName, headline, bio, language: locale, phone })
      const d = res.data.data
      const token = localStorage.getItem('lh_token') || ''
      const refresh = localStorage.getItem('lh_refresh') || ''
      if (user) {
        login({
          userId: user.id,
          username: user.username,
          fullName: d.fullName,
          role: user.role,
          accessToken: token,
          refreshToken: refresh,
        })
      }
      setOk(true)
      setMsg(res.data.message || (vi ? 'Đã lưu hồ sơ.' : 'Profile saved.'))
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setOk(false)
      setMsg(ax.response?.data?.message || (vi ? 'Không lưu được' : 'Could not save'))
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const res = await axiosClient.post('/api/users/me/change-password', { currentPassword, newPassword })
      setOk(true)
      setMsg(res.data.message)
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setOk(false)
      setMsg(ax.response?.data?.message || (vi ? 'Không đổi được mật khẩu' : 'Could not change password'))
    }
  }

  const changeEmail = async (e: FormEvent) => {
    e.preventDefault()
    setVerifyUrl(null)
    try {
      const res = await axiosClient.post('/api/users/me/change-email', { email: nextEmail, currentPassword: emailPassword })
      const next = res.data.data?.user
      setEmail(next?.email || nextEmail)
      setVerified(!!next?.emailVerified)
      setVerifyUrl(res.data.data?.devVerifyUrl || null)
      setEmailPassword('')
      setOk(true)
      setMsg(res.data.message || (vi ? 'Đã đổi email.' : 'Email updated.'))
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setOk(false)
      setMsg(ax.response?.data?.message || (vi ? 'Không đổi được email. Hãy bật lại identity-service.' : 'Could not change email. Restart identity-service.'))
    }
  }

  const resend = async () => {
    setVerifyUrl(null)
    try {
      const res = await axiosClient.post('/api/auth/resend-verification')
      setVerifyUrl(res.data.data?.devVerifyUrl || null)
      setOk(true)
      setMsg(res.data.message || (vi ? 'Đã gửi email xác thực.' : 'Verification email sent.'))
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setOk(false)
      setMsg(ax.response?.data?.message || (vi ? 'Không gửi được email xác thực.' : 'Could not resend verification.'))
    }
  }

  const initial = (fullName || user?.username || 'L').trim().charAt(0).toUpperCase()

  return (
    <div className="page learner-hub">
      <LearnerTabs />
      <header className="learner-hero">
        <p>{vi ? 'Hồ sơ' : 'Profile'}</p>
        <h1>{vi ? 'Tài khoản' : 'Account'}</h1>
      </header>
      <div className="account-layout">
        <aside className="account-card">
          <div className="account-avatar" aria-hidden="true">{initial}</div>
          <strong>{fullName || user?.username}</strong>
          <span className="muted">{email}</span>
          <span className="muted">{verified ? (vi ? 'Email đã xác thực' : 'Email verified') : (vi ? 'Email chưa xác thực' : 'Email not verified')}</span>
          {phone && <span className="muted">{phone}</span>}
          <span className="account-role">{roleLabel(user?.role, vi)}</span>
          {user?.username && <span className="muted">@{user.username}</span>}
        </aside>
        <div className="account-forms">
          <form onSubmit={save} className="learner-panel">
            <h2>{vi ? 'Thông tin cá nhân' : 'Personal details'}</h2>
            <label>{vi ? 'Họ tên' : 'Full name'}</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <label>{vi ? 'Số điện thoại' : 'Phone'}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
            <label>Headline</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={vi ? 'Ví dụ: Học viên Java' : 'Example: Java learner'} />
            <label>{vi ? 'Giới thiệu' : 'About'}</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
            <label>{vi ? 'Ngôn ngữ giao diện' : 'Interface language'}</label>
            <LanguageSwitch />
            <button type="submit">{vi ? 'Lưu hồ sơ' : 'Save profile'}</button>
          </form>
          <form onSubmit={changeEmail} className="learner-panel">
            <h2>{vi ? 'Đổi email' : 'Change email'}</h2>
            <input type="email" value={nextEmail} onChange={(e) => setNextEmail(e.target.value)} required />
            <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} placeholder={vi ? 'Mật khẩu hiện tại' : 'Current password'} required />
            <button type="submit" className="ghost">{vi ? 'Đổi email' : 'Update email'}</button>
            {!verified && <button type="button" className="ghost" onClick={resend}>{vi ? 'Gửi lại email xác thực' : 'Resend verification'}</button>}
            {verifyUrl && <a href={verifyUrl}>{vi ? 'Mở liên kết xác thực' : 'Open verification link'}</a>}
          </form>
          <form onSubmit={changePassword} className="learner-panel">
            <h2>{vi ? 'Đổi mật khẩu' : 'Change password'}</h2>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={vi ? 'Mật khẩu hiện tại' : 'Current password'} required />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={vi ? 'Mật khẩu mới (từ 6 ký tự)' : 'New password (6+ characters)'} required />
            <button type="submit" className="ghost">{vi ? 'Đổi mật khẩu' : 'Update password'}</button>
          </form>
          {msg && <p className={ok ? 'learner-ok' : 'err'}>{msg}</p>}
        </div>
      </div>
    </div>
  )
}
