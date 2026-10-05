import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [message, setMessage] = useState(vi ? 'Đang xác thực email…' : 'Verifying email…')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setMessage(vi ? 'Thiếu mã xác thực.' : 'Missing verification token.')
      return
    }
    axiosClient.get('/api/auth/verify-email', { params: { token } })
      .then((res) => {
        setOk(true)
        setMessage(res.data.message || (vi ? 'Email đã được xác thực.' : 'Email verified.'))
      })
      .catch((err) => {
        setOk(false)
        setMessage(err?.response?.data?.message || (vi ? 'Không xác thực được email.' : 'Could not verify email.'))
      })
  }, [params, vi])

  return (
    <div className="form">
      <h2>{vi ? 'Xác thực email' : 'Verify email'}</h2>
      <p className={ok ? 'muted' : 'err'}>{message}</p>
      <p><Link to="/cart">{vi ? 'Về giỏ hàng' : 'Back to cart'}</Link></p>
    </div>
  )
}
