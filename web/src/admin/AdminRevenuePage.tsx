import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'
import { money } from './adminUtils'

interface Order {
  id: number
  buyerId: number
  status: string
  total: number
  platformFee: number
  instructorEarn: number
  couponCode?: string
  createdAt: string
}

interface Summary {
  paidOrders: number
  failedOrders: number
  revenue: number
  platformFee: number
  instructorEarn: number
  avgOrder: number
  itemsSold: number
}

export default function AdminRevenuePage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [summary, setSummary] = useState<Summary | null>(null)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    axiosClient.get('/api/commerce/admin/analytics').then((r) => setSummary(r.data.data?.summary)).catch(() => {})
    axiosClient.get('/api/commerce/admin/orders?size=30').then((r) => setOrders(r.data.data || [])).catch(() => {})
  }, [])

  const kpis = summary ? [
    { label: vi ? 'Doanh thu' : 'Revenue', value: money(summary.revenue) },
    { label: vi ? 'Phí sàn 30%' : 'Platform fee 30%', value: money(summary.platformFee) },
    { label: vi ? 'Giảng viên nhận' : 'Instructor earn', value: money(summary.instructorEarn) },
    { label: vi ? 'Đơn trung bình' : 'Average order', value: money(summary.avgOrder) },
  ] : []

  return (
    <div>
      <h2>{vi ? 'Doanh thu' : 'Revenue'}</h2>
      <div className="admin-kpis">
        {kpis.map((k) => (
          <article key={k.label} className="admin-kpi">
            <span className="muted">{k.label}</span>
            <strong>{k.value}</strong>
          </article>
        ))}
      </div>
      <p className="muted">{vi ? `Đơn thành công ${summary?.paidOrders ?? 0} · thất bại ${summary?.failedOrders ?? 0} · khóa đã bán ${summary?.itemsSold ?? 0}` : `Paid ${summary?.paidOrders ?? 0} · failed ${summary?.failedOrders ?? 0} · items ${summary?.itemsSold ?? 0}`}</p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{vi ? 'Người mua' : 'Buyer'}</th>
            <th>{vi ? 'Tổng' : 'Total'}</th>
            <th>{vi ? 'Phí sàn' : 'Fee'}</th>
            <th>{vi ? 'Trạng thái' : 'Status'}</th>
            <th>{vi ? 'Thời gian' : 'Time'}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>#{o.buyerId}</td>
              <td>{money(o.total)}</td>
              <td>{money(o.platformFee)}</td>
              <td>{o.status}</td>
              <td>{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
