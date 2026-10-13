import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'

function homeOf(role?: string) {
  return role === 'ADMIN' ? '/admin' : '/'
}

export default function VerifyEmailPage() {
  const { locale } = useI18n()
  const { user, isAuthenticated, login, markEmailVerified } = useAuth()
  const navigate = useNavigate()
  const vi = locale === 'vi'
  const [params] = useSearchParams()
  const token = (params.get('token') || '').replace(/\s+/g, '')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [devUrl, setDevUrl] = useState<string | null>(() => sessionStorage.getItem('lh-dev-verify'))

  useEffect(() => {
    if (user?.emailVerified) {
      navigate(homeOf(user.role), { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (!token || user?.emailVerified) return
    const controller = new AbortController()
    axiosClient.get('/api/auth/verify-email', { params: { token }, timeout: 15000, signal: controller.signal })
      .then((res) => {
        const session = res.data?.data
        sessionStorage.removeItem('lh-dev-verify')
        if (session?.accessToken) {
          login(session)
        } else {
          markEmailVerified()
        }
        navigate(homeOf(session?.role || user?.role), { replace: true })
      })
      .catch((err) => {
        if (controller.signal.aborted || err.code === 'ERR_CANCELED') return
        const timeout = err.code === 'ECONNABORTED'
        setError(timeout
          ? (vi ? 'Máy chủ không trả lời. Hãy gửi lại email xác thực hoặc chạy lại identity-service.' : 'The server did not answer. Resend the email or restart identity-service.')
          : axios.isAxiosError(err)
            ? err.response?.data?.message || (vi ? 'Không xác thực được.' : 'Could not verify.')
            : (vi ? 'Không xác thực được.' : 'Could not verify.'))
      })
    return () => controller.abort()
  }, [token, vi, user, login, markEmailVerified, navigate])

  const resend = async (event: FormEvent) => {
    event.preventDefault()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await axiosClient.post('/api/auth/resend-verification')
      const next = res.data?.data?.devVerifyUrl || null
      if (next) {
        sessionStorage.setItem('lh-dev-verify', next)
        setDevUrl(next)
      }
      setMsg(vi ? 'Đã gửi lại email xác thực. Hãy kiểm tra hộp thư.' : 'Verification email sent. Check your inbox.')
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? err.response?.data?.message || (vi ? 'Không gửi lại được.' : 'Could not resend.')
        : (vi ? 'Không gửi lại được.' : 'Could not resend.'))
    } finally {
      setBusy(false)
    }
  }

  if (user?.emailVerified) return null

  return (
    <div className="form">
      <h2>{vi ? 'Xác thực email' : 'Verify email'}</h2>
      {!token && (
        <p>{vi
          ? 'Vui lòng kiểm tra email và bấm liên kết xác thực. Giỏ hàng và đơn mua chỉ mở sau khi email được xác thực.'
          : 'Check your email and open the verification link. The cart and orders stay closed until the email is verified.'}</p>
      )}
      {token && !msg && !error && <p className="muted">{vi ? 'Đang xác thực...' : 'Verifying...'}</p>}
      {msg && <p className="learner-ok">{msg}</p>}
      {error && <p className="err">{error}</p>}
      {devUrl && <p><a href={devUrl}>{vi ? 'Mở liên kết xác thực' : 'Open verification link'}</a></p>}
      {(error || !token) && (
        <form onSubmit={resend}>
          <button type="submit" disabled={busy}>{busy ? '...' : (vi ? 'Gửi lại email xác thực' : 'Resend verification email')}</button>
        </form>
      )}
    </div>
  )
}
