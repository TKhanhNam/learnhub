import { FormEvent, useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import LanguageSwitch from '../components/LanguageSwitch'

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
  const [email, setEmail] = useState('')

  useEffect(() => {
    axiosClient.get('/api/users/me').then((res) => {
      const d = res.data.data
      setFullName(d.fullName || '')
      setHeadline(d.headline || '')
      setBio(d.bio || '')
      if (d.language === 'vi' || d.language === 'en') setLocale(d.language)
      setEmail(d.email || '')
    }).catch(() => {})
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const res = await axiosClient.put('/api/users/me', { fullName, headline, bio, language: locale })
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
      setMsg(res.data.message || (vi ? 'Đã lưu hồ sơ.' : 'Profile saved.'))
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setMsg(ax.response?.data?.message || 'Không lưu được')
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const res = await axiosClient.post('/api/users/me/change-password', { currentPassword, newPassword })
      setMsg(res.data.message)
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setMsg(ax.response?.data?.message || 'Không đổi được mật khẩu')
    }
  }

  return (
    <div className="page">
      <h1>Tài khoản</h1>
      <p className="muted">{email} · {user?.username} · {user?.role}</p>
      <form onSubmit={save} className="stack" style={{ maxWidth: 520 }}>
        <label>Họ tên</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <label>Headline</label>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Ví dụ: Học viên Java" />
        <label>Giới thiệu</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
        <label>{vi ? 'Ngôn ngữ giao diện' : 'Interface language'}</label>
        <LanguageSwitch />
        <button type="submit">{vi ? 'Lưu hồ sơ' : 'Save profile'}</button>
      </form>
      <h3>Đổi mật khẩu</h3>
      <form onSubmit={changePassword} className="stack" style={{ maxWidth: 520 }}>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mật khẩu hiện tại" required />
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới (từ 6 ký tự)" required />
        <button type="submit" className="ghost">Đổi mật khẩu</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  )
}
