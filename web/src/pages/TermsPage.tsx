import { Link } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'

export default function TermsPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const blocks = vi
    ? [
        ['Tài khoản', 'Bạn chịu trách nhiệm với mật khẩu của mình. Sai mật khẩu 5 lần trong 10 phút thì địa chỉ IP bị khóa 15 phút. Email đổi mới phải xác thực lại trước khi dùng cho thanh toán.'],
        ['Mua khóa học', 'Khóa học mua thành công thuộc về tài khoản của bạn. Bạn học trên web, theo tiến độ của mình. Giá và mã giảm giá hiển thị ở giỏ hàng trước khi thanh toán.'],
        ['Đánh giá', 'Chỉ đánh giá khóa học bạn đã mua. Nhận xét phải nói về nội dung khóa. Giảng viên có thể trả lời dưới đánh giá.'],
        ['Chứng chỉ', 'Chứng chỉ được cấp khi bạn hoàn thành khóa theo điều kiện của khóa đó. Chứng chỉ ghi tên trên tài khoản.'],
        ['Cấm', 'Không chia sẻ tài khoản, không sao chép bài giảng để bán lại, không dùng LearnHub để gửi nội dung vi phạm pháp luật. Vi phạm có thể bị khóa tài khoản.'],
      ]
    : [
        ['Accounts', 'You are responsible for your password. Five wrong passwords in 10 minutes lock that IP for 15 minutes. A new email must be verified again before it can be used for payment.'],
        ['Buying courses', 'A purchased course stays on your account. You study on the web at your own pace. The price and any coupon are shown in the cart before you pay.'],
        ['Reviews', 'Review only courses you have bought. Comments should be about the course. The instructor can reply under a review.'],
        ['Certificates', 'A certificate is issued when you finish a course under that course’s rules. It uses the name on your account.'],
        ['Prohibited', 'Do not share your account, resell lessons, or use LearnHub for illegal content. Violations can lock the account.'],
      ]
  return (
    <div className="page terms-page">
      <header className="learner-hero">
        <p>LearnHub</p>
        <h1>{vi ? 'Điều khoản' : 'Terms'}</h1>
      </header>
      {blocks.map(([title, body]) => (
        <section key={title} className="learner-panel">
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
      <p><Link to="/help">{vi ? 'Xem trang hướng dẫn' : 'Read the help page'}</Link></p>
    </div>
  )
}
