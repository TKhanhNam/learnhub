import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

interface Demo { id: number; company: string; contactEmail: string; message: string; status: string }

export default function AdminBusinessPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [items, setItems] = useState<Demo[]>([])

  useEffect(() => {
    axiosClient.get('/api/org/admin/demo-requests').then((r) => setItems(r.data.data || [])).catch(() => setItems([]))
  }, [])

  return (
    <div>
      <h2>{vi ? 'Gói Business / yêu cầu demo' : 'Business demos'}</h2>
      {items.map((d) => (
        <article key={d.id} className="card" style={{ marginBottom: 8 }}>
          <div className="body">
            <strong>{d.company}</strong>
            <p>{d.contactEmail} · {d.status}</p>
            <p className="muted">{d.message}</p>
          </div>
        </article>
      ))}
      {items.length === 0 && <p className="muted">{vi ? 'Chưa có yêu cầu demo.' : 'No demo requests yet.'}</p>}
    </div>
  )
}
