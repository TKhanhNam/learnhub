import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'
import { money } from './adminUtils'

interface Point { date: string; revenue: number; orders: number }
interface Course { courseId: number; title: string; sold: number; revenue: number }
interface Analytics { last14Days: Point[]; topCourses: Course[]; summary: { revenue: number; paidOrders: number } }

export default function AdminAnalyticsPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [data, setData] = useState<Analytics | null>(null)

  useEffect(() => {
    axiosClient.get('/api/commerce/admin/analytics').then((r) => setData(r.data.data)).catch(() => {})
  }, [])

  const max = Math.max(1, ...(data?.last14Days.map((p) => Number(p.revenue)) || [1]))

  return (
    <div>
      <h2>{vi ? 'Phân tích chỉ số' : 'Analytics'}</h2>
      <p className="muted">{vi ? 'Doanh thu 14 ngày gần nhất và khóa học bán chạy.' : 'Revenue in the last 14 days and best-selling courses.'}</p>
      <div className="admin-bars">
        {(data?.last14Days || []).map((p) => (
          <div key={p.date} className="admin-bar">
            <div className="admin-bar-fill" style={{ height: `${Math.max(8, (Number(p.revenue) / max) * 140)}px` }} title={money(p.revenue)} />
            <small>{p.date.slice(5)}</small>
          </div>
        ))}
      </div>
      <h3>{vi ? 'Khóa học bán chạy' : 'Top courses'}</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{vi ? 'Khóa học' : 'Course'}</th>
            <th>{vi ? 'Số lượng' : 'Sold'}</th>
            <th>{vi ? 'Doanh thu' : 'Revenue'}</th>
          </tr>
        </thead>
        <tbody>
          {(data?.topCourses || []).map((c) => (
            <tr key={c.courseId}>
              <td>{c.title}</td>
              <td>{c.sold}</td>
              <td>{money(c.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
