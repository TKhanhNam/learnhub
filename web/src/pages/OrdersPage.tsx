import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type CourseOrder, orders, setOrderStatus } from '../lib/buyerStore'
import { useI18n } from '../context/I18nContext'

const LABEL: Record<CourseOrder['status'], [string, string]> = {
  held: ['Đang giữ tiền', 'Held'],
  cancelled: ['Đã hủy', 'Cancelled'],
  received: ['Đã vào học', 'Access confirmed'],
  complaint: ['Đang khiếu nại', 'Complaint'],
  refunded: ['Đã hoàn MoMo', 'MoMo refunded'],
}

export default function OrdersPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [rows, setRows] = useState(orders)

  const act = (id: string, status: CourseOrder['status']) => {
    setOrderStatus(id, status)
    setRows(orders())
  }

  return (
    <div className="page">
      <header className="learner-hero">
        <p>{vi ? 'Người mua' : 'Buyer'}</p>
        <h1>{vi ? 'Đơn mua' : 'Orders'}</h1>
      </header>
      <p className="muted">
        {vi
          ? 'Khóa học không giao qua GHN nên không có phí ship và không có vận đơn. Tiền MoMo được giữ đến khi bạn xác nhận đã vào học được.'
          : 'Courses are not shipped, so there is no courier fee or tracking number. MoMo funds stay held until you confirm you can start the course.'}
      </p>
      {!rows.length && <p className="muted">{vi ? 'Chưa có đơn. Đặt mua từ một tin trong chợ.' : 'No orders yet. Buy from a course listing.'}</p>}
      {rows.map((order) => (
        <article key={order.id} className="learner-panel">
          <h2>{order.title}</h2>
          <p className="muted">{order.shop} · {order.method === 'momo' ? 'MoMo' : (vi ? 'Trả sau khi vào học' : 'Pay when access starts')}</p>
          <p>{order.total.toLocaleString('vi-VN')} đ {order.voucher ? `· ${order.voucher}` : ''}</p>
          <p><strong>{vi ? LABEL[order.status][0] : LABEL[order.status][1]}</strong></p>
          <ol className="order-steps">
            <li className="on">{vi ? 'Đã đặt' : 'Placed'}</li>
            <li className={order.status === 'cancelled' ? '' : 'on'}>{vi ? 'Đang giữ tiền' : 'Funds held'}</li>
            <li className={order.status === 'received' ? 'on' : ''}>{vi ? 'Đã mở khóa' : 'Unlocked'}</li>
          </ol>
          <div className="row">
            {order.status === 'held' && <button type="button" className="ghost" onClick={() => act(order.id, 'cancelled')}>{vi ? 'Hủy đơn' : 'Cancel'}</button>}
            {(order.status === 'held' || order.status === 'complaint') && <button type="button" onClick={() => act(order.id, 'received')}>{vi ? 'Xác nhận đã vào học' : 'Confirm access'}</button>}
            {order.status === 'held' && <button type="button" className="ghost" onClick={() => act(order.id, 'complaint')}>{vi ? 'Khiếu nại' : 'Complain'}</button>}
            {order.method === 'momo' && (order.status === 'held' || order.status === 'complaint') && (
              <button type="button" className="ghost" onClick={() => act(order.id, 'refunded')}>{vi ? 'Hoàn MoMo' : 'Refund MoMo'}</button>
            )}
            <Link to={`/courses/${order.slug}`}>{vi ? 'Xem khóa' : 'View course'}</Link>
          </div>
        </article>
      ))}
    </div>
  )
}
