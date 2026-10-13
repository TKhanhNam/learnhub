import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import LearnerTabs from '../components/LearnerTabs'
import { useI18n } from '../context/I18nContext'

interface Cert {
  code: string
  courseId: number
  courseTitle: string
  pdfStatus: string
  issuedAt: string
}

function statusLabel(status: string, vi: boolean) {
  if (status === 'READY') return vi ? 'Sẵn sàng' : 'Ready'
  if (status === 'PENDING') return vi ? 'Đang tạo' : 'Preparing'
  return status
}

export default function CertificatesPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [items, setItems] = useState<Cert[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    axiosClient.get('/api/learning/certificates')
      .then((res) => setItems(res.data.data || []))
      .catch((err) => setMsg(err.response?.data?.message || (vi ? 'Không tải được chứng chỉ' : 'Could not load certificates')))
  }, [vi])

  return (
    <div className="page learner-hub">
      <LearnerTabs />
      <header className="learner-hero">
        <p>{vi ? 'Hoàn thành khóa học' : 'Course completion'}</p>
        <h1>{vi ? 'Chứng chỉ' : 'Certificates'}</h1>
        <span className="muted">{vi ? 'Chứng nhận hoàn thành khóa học của bạn.' : 'Certificates for the courses you finish.'}</span>
      </header>
      <div className="cert-list">
        {items.map((c) => (
          <article key={c.code} className="cert-card">
            <div className="cert-seal" aria-hidden="true">LH</div>
            <div>
              <small>{vi ? 'Chứng nhận hoàn thành' : 'Certificate of completion'}</small>
              <strong>{c.courseTitle}</strong>
              <p className="muted">{c.code}</p>
              <p className="muted">
                {statusLabel(c.pdfStatus, vi)}
                {c.issuedAt ? ` · ${new Date(c.issuedAt).toLocaleDateString(vi ? 'vi-VN' : 'en-US')}` : ''}
              </p>
              <Link className="learner-go ghost" to={`/learn/${c.courseId}`}>{vi ? 'Mở khóa học' : 'Open course'}</Link>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && !msg && (
        <div className="learner-empty">
          <strong>{vi ? 'Chưa có chứng chỉ. Hoàn thành một khóa học để nhận chứng nhận.' : 'No certificates yet. Finish a course to earn one.'}</strong>
          <Link className="learner-go" to="/learning">{vi ? 'Khóa học của tôi' : 'My learning'}</Link>
        </div>
      )}
      {msg && <p className="err">{msg}</p>}
    </div>
  )
}
