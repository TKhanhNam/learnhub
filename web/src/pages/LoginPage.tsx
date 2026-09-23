import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      const res = await axiosClient.post('/api/auth/login', { username, password })
      login(res.data.data)
      navigate(res.data.data?.role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? err.response?.data?.message || (locale === 'vi' ? 'Đăng nhập thất bại' : 'Login failed')
        : (locale === 'vi' ? 'Đăng nhập thất bại' : 'Login failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h2>{t('login')} LearnHub</h2>
      <label>{locale === 'vi' ? 'Tên đăng nhập' : 'Username'}</label>
      <input value={username} onChange={(e) => setUsername(e.target.value)} />
      <label>{locale === 'vi' ? 'Mật khẩu' : 'Password'}</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="err">{error}</p>}
      <div style={{ marginTop: 16 }}>
        <button type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? '...' : t('login')}</button>
      </div>
      <p className="muted">
        {locale === 'vi' ? 'Chưa có tài khoản?' : 'No account yet?'} <Link to="/register">{t('register')}</Link>
      </p>
    </form>
  )
}
