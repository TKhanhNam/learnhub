import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

interface Cert {
  code: string
  courseId: number
  courseTitle: string
  pdfStatus: string
  issuedAt: string
}

export default function CertificatesPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [items, setItems] = useState<Cert[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const load = () => {
    axiosClient.get('/api/learning/certificates')
      .then((res) => setItems(res.data.data || []))
      .catch((err) => setMsg(err.response?.data?.message || (vi ? 'Không tải được chứng chỉ' : 'Could not load certificates')))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page">
      <h1>{vi ? 'Chứng chỉ' : 'Certificates'}</h1>
      <p className="muted">{vi ? 'Hoàn thành khóa rồi xuất chứng chỉ. PDF được xếp hàng (HTTP 202).' : 'Finish a course, then issue a certificate. PDF is queued (HTTP 202).'}</p>
      {items.map((c) => (
        <article key={c.code} className="card" style={{ marginBottom: 10 }}>
          <div className="body">
            <strong>{c.courseTitle}</strong>
            <p className="muted">{c.code} · {c.pdfStatus} · {c.issuedAt ? new Date(c.issuedAt).toLocaleString() : ''}</p>
            <Link to={`/learn/${c.courseId}`}>{vi ? 'Mở khóa học' : 'Open course'}</Link>
          </div>
        </article>
      ))}
      {items.length === 0 && !msg && <p className="muted">{vi ? 'Chưa có chứng chỉ. Vào khóa học của tôi để xuất.' : 'No certificates yet. Open My learning to issue one.'}</p>}
      {msg && <p className="err">{msg}</p>}
      <p><Link to="/learning">{vi ? 'Khóa học của tôi' : 'My learning'}</Link></p>
    </div>
  )
}
