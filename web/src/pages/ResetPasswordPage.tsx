import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

export default function ResetPasswordPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await axiosClient.post('/api/auth/reset-password', { token, newPassword: password })
      setMsg(res.data.message || (vi ? 'Đã đặt lại mật khẩu.' : 'Password updated.'))
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? err.response?.data?.message || (vi ? 'Không đặt lại được.' : 'Could not reset.')
        : (vi ? 'Không đặt lại được.' : 'Could not reset.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h2>{vi ? 'Đặt lại mật khẩu' : 'Reset password'}</h2>
      {!token && <p className="err">{vi ? 'Thiếu mã trong liên kết.' : 'The link is missing a token.'}</p>}
      <label>{vi ? 'Mật khẩu mới' : 'New password'}</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
      {msg && <p className="learner-ok">{msg}</p>}
      {error && <p className="err">{error}</p>}
      <div style={{ marginTop: 16 }}>
        <button type="submit" disabled={busy || !token} style={{ width: '100%' }}>{busy ? '...' : (vi ? 'Lưu mật khẩu' : 'Save password')}</button>
      </div>
      <p className="muted"><Link to="/login">{vi ? 'Đăng nhập' : 'Log in'}</Link></p>
    </form>
  )
}
