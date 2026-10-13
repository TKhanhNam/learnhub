import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

export default function ForgotPasswordPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMsg(null)
    setLink(null)
    try {
      const res = await axiosClient.post('/api/auth/forgot-password', { email })
      setMsg(res.data.message || (vi ? 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' : 'If the email exists, a reset link was sent.'))
      setLink(res.data.data?.devResetUrl || null)
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? err.response?.data?.message || (vi ? 'Chưa gửi được. Hãy bật lại identity-service.' : 'Could not send. Restart identity-service.')
        : (vi ? 'Chưa gửi được.' : 'Could not send.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h2>{vi ? 'Quên mật khẩu' : 'Forgot password'}</h2>
      <label>Email</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      {msg && <p className="learner-ok">{msg}</p>}
      {link && <p><a href={link}>{vi ? 'Mở liên kết đặt lại (máy chưa cấu hình gửi mail)' : 'Open the reset link'}</a></p>}
      {error && <p className="err">{error}</p>}
      <div style={{ marginTop: 16 }}>
        <button type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? '...' : (vi ? 'Gửi liên kết' : 'Send link')}</button>
      </div>
      <p className="muted"><Link to="/login">{vi ? 'Quay lại đăng nhập' : 'Back to login'}</Link></p>
    </form>
  )
}
