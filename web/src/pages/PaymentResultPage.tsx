import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

export default function PaymentResultPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [params] = useSearchParams()
  const status = params.get('status') || ''
  const orderId = params.get('orderId') || ''
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ok = status === 'success'

  const again = async () => {
    if (!orderId) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await axiosClient.post(`/api/commerce/orders/${orderId}/pay-momo`)
      const url = res.data.data?.payUrl
      if (url) window.location.href = url
      else setMsg(vi ? 'Không có đường dẫn MoMo.' : 'No MoMo link.')
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setMsg(ax.response?.data?.message || (vi ? 'Không thanh toán lại được.' : 'Could not pay again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="learner-hero">
        <p>LearnHub</p>
        <h1>{ok ? (vi ? 'Thanh toán thành công' : 'Payment successful') : (vi ? 'Thanh toán chưa xong' : 'Payment not finished')}</h1>
      </header>
      <section className="learner-panel">
        <p>
          {ok
            ? (vi ? 'MoMo đã xác nhận. Khóa học đã được mở.' : 'MoMo confirmed the payment. The course is open.')
            : (vi ? 'Giao dịch MoMo chưa thành công. Đơn cũ vẫn giữ, bấm thanh toán lại chứ không tạo đơn mới.' : 'MoMo did not complete. Pay again on the same order.')}
        </p>
        {orderId && <p className="muted">{vi ? 'Mã đơn' : 'Order'} #{orderId}</p>}
        {msg && <p className="err">{msg}</p>}
        <div className="pay-result-actions">
          {!ok && orderId && <button type="button" onClick={again} disabled={busy}>{vi ? 'Thanh toán lại bằng MoMo' : 'Pay again with MoMo'}</button>}
          <Link to="/learning" className="pay-result-learn">{vi ? 'Khóa học của tôi' : 'My learning'}</Link>
        </div>
      </section>
    </div>
  )
}
