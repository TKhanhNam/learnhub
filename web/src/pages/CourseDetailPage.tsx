import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import QaPanel from '../components/QaPanel'
import FavButton from '../components/FavButton'
import { messageTeacher } from '../components/ChatDock'
import { recordCourseClick } from '../lib/coursePopularity'

interface Course {
  id: number
  slug: string
  title: string
  subtitle: string
  description: string
  price: number
  level: string
  categoryName: string
  ratingAvg: number
  ratingCount: number
  enrollmentCount: number
  instructorId: number
  promoVideoUrl?: string
  skills?: string[]
  aiAssistEnabled?: boolean
}

interface Review {
  id: number
  authorName: string
  rating: number
  comment: string
  instructorReply?: string
}

interface Lecture { id: number; title: string; type: string; durationSeconds: number; downloadUrl?: string }
interface Quiz { id: number; title: string; kind: string }
interface Assignment { id: number; title: string }

const COVERS = [
  'linear-gradient(145deg,#0f766e,#2dd4bf)',
  'linear-gradient(145deg,#9f1239,#fb7185)',
  'linear-gradient(145deg,#1d4ed8,#93c5fd)',
  'linear-gradient(145deg,#7c2d12,#fb923c)',
  'linear-gradient(145deg,#4c1d95,#c4b5fd)',
  'linear-gradient(145deg,#14532d,#86efac)',
  'linear-gradient(145deg,#831843,#f9a8d4)',
  'linear-gradient(145deg,#1e3a8a,#38bdf8)',
]

function coverFor(id: number) {
  return COVERS[Math.abs(id) % COVERS.length]
}

function levelLabel(level: string, vi: boolean) {
  if (level === 'BEGINNER') return vi ? 'Cơ bản' : 'Beginner'
  if (level === 'ADVANCED') return vi ? 'Nâng cao' : 'Advanced'
  return vi ? 'Trung cấp' : 'Intermediate'
}

function clock(seconds: number) {
  const total = Math.max(0, Number(seconds) || 0)
  if (total < 60) return `${total}s`
  return `${Math.round(total / 60)} phút`
}

export default function CourseDetailPage() {
  const { slug } = useParams()
  const { t, locale } = useI18n()
  const vi = locale === 'vi'
  const [course, setCourse] = useState<Course | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [owned, setOwned] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [teacher, setTeacher] = useState('')
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    axiosClient.get(`/api/catalog/courses/${slug}`).then((res) => {
      const c = res.data.data as Course
      setCourse(c)
      recordCourseClick({ id: c.id, slug: c.slug, title: c.title })
      fetch(`/api/social/reviews?courseId=${c.id}`).then((r) => r.json()).then((body) => setReviews(body.data || [])).catch(() => {})
      fetch(`/api/content/courses/${c.id}/curriculum`).then((r) => r.json()).then((body) => {
        setLectures(body.data?.lectures || [])
        setQuizzes(body.data?.quizzes || [])
        setAssignments(body.data?.assignments || [])
      }).catch(() => {})
      if (isAuthenticated) {
        axiosClient.get(`/api/learning/access/${c.id}`).then((r) => setOwned(!!r.data.data?.hasAccess)).catch(() => {})
      }
      if (c.instructorId) {
        fetch(`/api/users/${c.instructorId}/public`).then((r) => r.json()).then((body) => {
          setTeacher(body?.data?.fullName || '')
        }).catch(() => {})
      }
    }).catch((err) => setMsg(err.response?.data?.message || (vi ? 'Không tải được khóa học' : 'Could not load course')))
  }, [slug, locale, isAuthenticated])

  const addCart = async (gift = false) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    try {
      await axiosClient.post('/api/commerce/cart', { courseId: course?.id })
      navigate(gift ? '/cart' : '/cart')
    } catch (err) {
      setMsg(axios.isAxiosError(err) ? err.response?.data?.message || (vi ? 'Lỗi giỏ hàng' : 'Cart error') : (vi ? 'Lỗi giỏ hàng' : 'Cart error'))
    }
  }

  const sendReview = async (e: FormEvent) => {
    e.preventDefault()
    if (!course) return
    try {
      await axiosClient.post('/api/social/reviews', { courseId: course.id, rating, comment })
      const r = await axiosClient.get(`/api/social/reviews?courseId=${course.id}`)
      setReviews(r.data.data || [])
      setMsg(vi ? 'Đã gửi đánh giá.' : 'Review submitted.')
    } catch (err) {
      setMsg(axios.isAxiosError(err) ? err.response?.data?.message || (vi ? 'Cần mua khóa trước khi đánh giá.' : 'Purchase the course to review.') : '')
    }
  }

  if (!course) return <div className="page">{msg || (vi ? 'Đang tải...' : 'Loading...')}</div>

  const canTeach = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'
  const quizCount = quizzes.filter((q) => q.kind !== 'PRACTICE').length
  const practiceCount = quizzes.filter((q) => q.kind === 'PRACTICE').length
  const price = `${Number(course.price).toLocaleString('vi-VN')} ₫`

  return (
    <div className="page course-detail">
      <nav className="cd-crumb">
        <Link to="/courses">{t('courses')}</Link>
        <span>/</span>
        <span>{course.categoryName}</span>
      </nav>

      <div className="cd-layout">
        <div className="cd-main">
          <header className="cd-hero" style={{ background: coverFor(course.id) }}>
            <FavButton slug={course.slug} />
            <p>{course.categoryName} · {levelLabel(course.level, vi)}</p>
            <h1>{course.title}</h1>
            <p>{course.subtitle}</p>
          </header>

          <section className="cd-panel">
            <div className="cd-stats">
              <div><strong>{course.enrollmentCount}</strong><span>{t('students')}</span></div>
              <div><strong>{Number(course.ratingAvg || 0).toFixed(1)}</strong><span>/5 · {course.ratingCount || 0}</span></div>
              <div><strong>{lectures.length}</strong><span>{vi ? 'bài giảng' : 'lectures'}</span></div>
            </div>
            <p className="cd-lead">{course.description}</p>
            {course.skills?.length ? (
              <div className="cd-skills">
                {course.skills.map((skill) => <span key={skill}>{skill}</span>)}
              </div>
            ) : null}
            {course.aiAssistEnabled && (
              <p className="cd-note">{vi ? 'Khóa này có trợ lý AI khi đang học.' : 'This course includes the AI assistant while you learn.'}</p>
            )}
          </section>

          {course.promoVideoUrl && (
            <video className="player" src={course.promoVideoUrl} controls />
          )}

          <section className="cd-panel">
            <h2>{vi ? 'Giáo trình' : 'Curriculum'}</h2>
            <p className="muted">
              {quizCount} quiz · {practiceCount} practice test · {assignments.length} {vi ? 'bài tập' : 'assignments'}
            </p>
            {lectures.length === 0 && <p className="muted">{vi ? 'Giảng viên chưa đăng bài giảng.' : 'No lectures yet.'}</p>}
            <ol className="cd-lessons">
              {lectures.map((lecture, index) => (
                <li key={lecture.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{lecture.title}</strong>
                    <small>{lecture.type} · {clock(lecture.durationSeconds)}</small>
                  </div>
                  {owned && lecture.downloadUrl && (
                    <a href={lecture.downloadUrl} target="_blank" rel="noreferrer">{vi ? 'Tải' : 'Download'}</a>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="cd-panel">
            <h2>{t('reviews')}</h2>
            {owned && (
              <form onSubmit={sendReview} className="cd-review-form">
                <label>{vi ? 'Đánh giá sau khi mua' : 'Review after purchase'}</label>
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}/5</option>)}
                </select>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={vi ? 'Bạn học được gì từ khóa này?' : 'What did you learn?'} />
                <button type="submit">{vi ? 'Gửi đánh giá' : 'Submit review'}</button>
              </form>
            )}
            {reviews.map((review) => (
              <article key={review.id} className="cd-review">
                <header>
                  <strong>{review.authorName}</strong>
                  <span>{review.rating}/5</span>
                </header>
                <p>{review.comment}</p>
                {review.instructorReply && <p className="muted">{vi ? 'Giảng viên:' : 'Instructor:'} {review.instructorReply}</p>}
              </article>
            ))}
            {reviews.length === 0 && <p className="muted">{vi ? 'Chưa có đánh giá.' : 'No reviews yet.'}</p>}
          </section>

          <section className="cd-panel">
            <QaPanel courseId={course.id} canPost={owned} canAnswer={owned || canTeach} vi={vi} />
          </section>
        </div>

        <aside className="cd-buy">
          <p className="cd-price">{price}</p>
          <p className="muted">{t('lifetime')}</p>
          {owned ? (
            <Link to={`/learn/${course.id}`}><button type="button">{vi ? 'Vào học' : 'Start learning'}</button></Link>
          ) : (
            <>
              <button type="button" onClick={() => addCart(false)}>{t('addToCart')}</button>
              <button type="button" className="ghost" onClick={() => addCart(true)}>{t('gift')}</button>
            </>
          )}
          {user && user.id !== course.instructorId && (
            <button type="button" className="ghost" onClick={() => messageTeacher({
              instructorId: course.instructorId,
              instructorName: teacher || (vi ? 'Giảng viên' : 'Instructor'),
              learnerId: user.id,
              learnerName: user.fullName || user.username,
              courseTitle: course.title,
              courseSlug: course.slug,
            })}>{vi ? 'Nhắn giảng viên' : 'Message instructor'}</button>
          )}
          {msg && <p className={msg.includes('Đã') || msg.includes('submitted') ? 'ok' : 'err'}>{msg}</p>}
        </aside>
      </div>
    </div>
  )
}
