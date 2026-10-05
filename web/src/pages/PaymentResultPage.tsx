import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'

export default function PaymentResultPage() {
  const [params] = useSearchParams()
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const status = params.get('status') || 'failed'
  const success = status === 'success'

  const title = success
    ? (vi ? 'Thanh toán MoMo thành công' : 'MoMo payment succeeded')
    : (vi ? 'Thanh toán MoMo chưa hoàn tất' : 'MoMo payment was not completed')
  const detail = success
    ? (vi ? 'Khóa học đã được mở. Bạn có thể vào mục Đang học.' : 'Your courses are unlocked. Open My learning.')
    : (vi ? 'Giỏ hàng vẫn giữ nguyên. Bạn có thể thử lại khi sẵn sàng.' : 'Your cart is unchanged. You can try again.')

  return (
    <div className="form">
      <h2>{title}</h2>
      <p className={success ? 'muted' : 'err'}>{detail}</p>
      <p>
        <Link to={success ? '/learning' : '/cart'}>
          {success ? (vi ? 'Vào học' : 'Start learning') : (vi ? 'Về giỏ hàng' : 'Back to cart')}
        </Link>
      </p>
    </div>
  )
}
