import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('STUDENT')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await axiosClient.post('/api/auth/register', { username, email, fullName, password, role })
      login(res.data.data)
      navigate('/')
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? err.response?.data?.message || (locale === 'vi' ? 'Đăng ký thất bại' : 'Sign up failed')
        : (locale === 'vi' ? 'Đăng ký thất bại' : 'Sign up failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h2>{locale === 'vi' ? 'Tạo tài khoản' : 'Create an account'}</h2>
      <label>{locale === 'vi' ? 'Tên đăng nhập' : 'Username'}</label>
      <input value={username} onChange={(e) => setUsername(e.target.value)} />
      <label>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <label>{locale === 'vi' ? 'Họ tên' : 'Full name'}</label>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <label>{locale === 'vi' ? 'Mật khẩu' : 'Password'}</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <label>{locale === 'vi' ? 'Vai trò' : 'Role'}</label>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="STUDENT">{locale === 'vi' ? 'Học viên' : 'Student'}</option>
        <option value="INSTRUCTOR">{locale === 'vi' ? 'Giảng viên' : 'Instructor'}</option>
      </select>
      {error && <p className="err">{error}</p>}
      <div style={{ marginTop: 16 }}>
        <button type="submit" disabled={busy} style={{ width: '100%' }}>{t('register')}</button>
      </div>
      <p className="muted">
        {locale === 'vi' ? 'Đã có tài khoản?' : 'Already have an account?'} <Link to="/login">{t('login')}</Link>
      </p>
    </form>
  )
}
