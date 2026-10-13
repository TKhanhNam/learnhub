import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import LearnerTabs from '../components/LearnerTabs'
import TiltCard from '../components/TiltCard'
import { useI18n } from '../context/I18nContext'

interface Enrolled {
  enrollmentId: number
  courseId: number
  courseTitle: string
  courseSlug: string
  progressPercent: number
  totalLectures?: number
  completedLectures?: number
}

const COVERS = [
  'linear-gradient(145deg,#1d4ed8,#93c5fd)',
  'linear-gradient(145deg,#0f766e,#2dd4bf)',
  'linear-gradient(145deg,#4c1d95,#c4b5fd)',
  'linear-gradient(145deg,#9f1239,#fb7185)',
  'linear-gradient(145deg,#1e3a8a,#38bdf8)',
  'linear-gradient(145deg,#7c2d12,#fb923c)',
]

export default function LearningPage() {
  const { locale, t } = useI18n()
  const vi = locale === 'vi'
  const [courses, setCourses] = useState<Enrolled[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axiosClient.get('/api/learning/my-courses')
      .then((res) => setCourses(res.data.data || []))
      .catch((err) => setError(err.response?.data?.message || (vi ? 'Không tải được khóa học' : 'Could not load courses')))
  }, [vi])

  const done = courses.filter((c) => c.progressPercent >= 100).length
  const avg = courses.length
    ? Math.round(courses.reduce((sum, c) => sum + Number(c.progressPercent || 0), 0) / courses.length)
    : 0

  return (
    <div className="page learner-hub">
      <LearnerTabs />
      <header className="learner-hero">
        <p>{vi ? 'Tiếp tục học' : 'Keep learning'}</p>
        <h1>{t('learning')}</h1>
        <div className="learner-stats">
          <div><strong>{courses.length}</strong><span>{vi ? 'Khóa đã mua' : 'Courses'}</span></div>
          <div><strong>{avg}%</strong><span>{vi ? 'Tiến độ trung bình' : 'Average progress'}</span></div>
          <div><strong>{done}</strong><span>{vi ? 'Đã hoàn thành' : 'Completed'}</span></div>
        </div>
      </header>
      {error && <p className="err">{error}</p>}
      <div className="learner-grid">
        {courses.map((c) => (
          <TiltCard key={c.enrollmentId}>
            <div className="learner-cover" style={{ background: COVERS[c.courseId % COVERS.length] }}>
              <span>{c.progressPercent || 0}%</span>
            </div>
            <div className="learner-body">
              <strong>{c.courseTitle}</strong>
              <div className="learner-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, c.progressPercent || 0)}%` }} /></div>
              <p className="muted">
                {c.totalLectures
                  ? `${c.completedLectures || 0}/${c.totalLectures} ${vi ? 'bài' : 'lessons'} · `
                  : ''}
                {t('lifetime')}
              </p>
              <Link className="learner-go" to={`/learn/${c.courseId}`}>{vi ? 'Vào học' : 'Continue'}</Link>
            </div>
          </TiltCard>
        ))}
      </div>
      {courses.length === 0 && !error && (
        <div className="learner-empty">
          <strong>{t('emptyLearning')}</strong>
          <Link className="learner-go" to="/courses">{vi ? 'Xem khóa học' : 'Browse courses'}</Link>
        </div>
      )}
    </div>
  )
}
