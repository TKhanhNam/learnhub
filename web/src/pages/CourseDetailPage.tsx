import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import QaPanel from '../components/QaPanel'
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

  return (
    <div className="page course-detail">
      <p className="muted">{course.categoryName} · {course.level}</p>
      <h1>{course.title}</h1>
      <p className="muted">{course.subtitle}</p>
      <p>{course.description}</p>
      <p>{course.enrollmentCount} {t('students')} · {Number(course.ratingAvg || 0).toFixed(1)}/5 ({course.ratingCount || 0})</p>
      {course.skills?.length ? <p className="muted">{vi ? 'Kỹ năng:' : 'Skills:'} {course.skills.join(', ')}</p> : null}
      {course.aiAssistEnabled && <p className="muted">{vi ? 'Khóa này bật trợ lý AI (sàn đớp thêm % trên phần giảng viên).' : 'AI assistant is on (platform takes an extra %).'}</p>}
      <p className="price">{Number(course.price).toLocaleString('vi-VN')} ₫ · {t('lifetime')}</p>
      <div className="row">
        {owned ? (
          <Link to={`/learn/${course.id}`}><button>{vi ? 'Vào học' : 'Start learning'}</button></Link>
        ) : (
          <>
            <button onClick={() => addCart(false)}>{t('addToCart')}</button>
            <button className="ghost" onClick={() => addCart(true)}>{t('gift')}</button>
          </>
        )}
      </div>
      {course.promoVideoUrl && (
        <video className="player" src={course.promoVideoUrl} controls style={{ marginTop: 16, width: '100%', maxHeight: 360 }} />
      )}
      {msg && <p>{msg}</p>}

      <h3>{vi ? 'Giáo trình' : 'Curriculum'}</h3>
      {lectures.map((l) => (
        <div key={l.id} className="card" style={{ marginBottom: 6 }}>
          <div className="body row">
            <span className="grow">{l.title}</span>
            <span className="muted">{l.type} · {l.durationSeconds}s</span>
            {owned && l.downloadUrl && <a href={l.downloadUrl} target="_blank" rel="noreferrer">{vi ? 'Tải tài liệu' : 'Download'}</a>}
          </div>
        </div>
      ))}
      {lectures.length === 0 && <p className="muted">{vi ? 'Giảng viên chưa đăng bài giảng.' : 'No lectures yet.'}</p>}
      <p className="muted">
        {quizzes.filter((q) => q.kind !== 'PRACTICE').length} quiz · {quizzes.filter((q) => q.kind === 'PRACTICE').length} practice test · {assignments.length} {vi ? 'bài tập' : 'assignments'}
      </p>

      <h3>{t('reviews')}</h3>
      {owned && (
        <form onSubmit={sendReview} className="stack" style={{ maxWidth: 520, marginBottom: 16 }}>
          <label>{vi ? 'Đánh giá của bạn (sau khi mua)' : 'Your review (after purchase)'}</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}/5</option>)}
          </select>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          <button type="submit">{vi ? 'Gửi đánh giá' : 'Submit review'}</button>
        </form>
      )}
      {reviews.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 8 }}>
          <div className="body">
            <strong>{r.authorName}</strong> · {r.rating}/5
            <p>{r.comment}</p>
            {r.instructorReply && <p className="muted">{vi ? 'Giảng viên:' : 'Instructor:'} {r.instructorReply}</p>}
          </div>
        </div>
      ))}
      {reviews.length === 0 && <p className="muted">{vi ? 'Chưa có đánh giá. Xem rating trước khi mua ở đây.' : 'No reviews yet.'}</p>}

      <QaPanel courseId={course.id} canPost={owned} canAnswer={owned || canTeach} vi={vi} />
    </div>
  )
}
