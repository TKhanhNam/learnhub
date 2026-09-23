import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'
import TiltCard from '../components/TiltCard'

interface Enrolled {
  enrollmentId: number
  courseId: number
  courseTitle: string
  courseSlug: string
  progressPercent: number
}

export default function LearningPage() {
  const { t } = useI18n()
  const [courses, setCourses] = useState<Enrolled[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axiosClient.get('/api/learning/my-courses')
      .then((res) => setCourses(res.data.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Lỗi tải khóa học'))
  }, [])

  return (
    <div className="page">
      <h1>{t('learning')}</h1>
      <p><Link to="/certificates">{t('certs')}</Link> · {t('lifetime')}</p>
      {error && <p className="err">{error}</p>}
      <div className="grid">
        {courses.map((c) => (
          <TiltCard key={c.enrollmentId} to={`/learn/${c.courseId}`}>
            <div className="thumb">{c.progressPercent}%</div>
            <div className="body">
              <strong>{c.courseTitle}</strong>
              <p className="muted">{t('lifetime')}</p>
            </div>
          </TiltCard>
        ))}
      </div>
      {courses.length === 0 && !error && <p className="muted">{t('emptyLearning')}</p>}
    </div>
  )
}
