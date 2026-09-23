import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'
import TiltCard from '../components/TiltCard'
import Overview3D from '../components/Overview3D'
import LearningAtmosphere from '../components/LearningAtmosphere'
import HeroGlassStage from '../components/HeroGlassStage'
import StudySparkRow from '../components/StudySparkRow'
import CourseBookshelf from '../components/CourseBookshelf'

interface Course {
  id: number
  slug: string
  title: string
  subtitle: string
  price: number
  categoryName: string
  ratingAvg: number
  ratingCount?: number
  enrollmentCount?: number
  instructorId?: number
}

interface TopInstructor {
  id: number
  fullName: string
  headline: string
  ratingAvg: number
  ratingCount: number
  courseCount: number
  enrollments: number
  topCourseSlug?: string
  topCategory?: string
}

const GOALS = [
  { id: 'biz', key: 'goalBiz' as const, q: 'kinh doanh' },
  { id: 'lead', key: 'goalLead' as const, q: 'lãnh đạo' },
  { id: 'create', key: 'goalCreate' as const, q: 'sáng tạo' },
  { id: 'tech', key: 'goalTech' as const, q: 'công nghệ' },
  { id: 'design', key: 'goalDesign' as const, q: 'thiết kế' },
]

type Agg = {
  instructorId: number
  weighted: number
  ratingCount: number
  courseCount: number
  enrollments: number
  bestCourse: Course | null
  bestScore: number
}

function rankInstructors(courses: Course[], limit = 8): Agg[] {
  const map = new Map<number, Agg>()
  for (const c of courses) {
    const id = Number(c.instructorId || 0)
    if (!id) continue
    const avg = Number(c.ratingAvg || 0)
    const count = Math.max(0, Number(c.ratingCount || 0))
    const enroll = Number(c.enrollmentCount || 0)
    const score = count > 0 ? avg * 1000 + count : enroll
    const cur = map.get(id) || {
      instructorId: id,
      weighted: 0,
      ratingCount: 0,
      courseCount: 0,
      enrollments: 0,
      bestCourse: null,
      bestScore: -1,
    }
    cur.courseCount += 1
    cur.enrollments += enroll
    if (count > 0) {
      cur.weighted += avg * count
      cur.ratingCount += count
    } else if (avg > 0) {
      cur.weighted += avg
      cur.ratingCount += 1
    }
    if (score >= cur.bestScore) {
      cur.bestScore = score
      cur.bestCourse = c
    }
    map.set(id, cur)
  }
  return [...map.values()]
    .sort((a, b) => {
      const ra = a.ratingCount ? a.weighted / a.ratingCount : 0
      const rb = b.ratingCount ? b.weighted / b.ratingCount : 0
      if (rb !== ra) return rb - ra
      if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount
      if (b.enrollments !== a.enrollments) return b.enrollments - a.enrollments
      return b.courseCount - a.courseCount
    })
    .slice(0, limit)
}

export default function HomePage() {
  const { t, locale } = useI18n()
  const vi = locale === 'vi'
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [instructors, setInstructors] = useState<TopInstructor[]>([])
  const [instructorsReady, setInstructorsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courseCount, setCourseCount] = useState(0)
  const [categoryCount, setCategoryCount] = useState(0)
  const [learners, setLearners] = useState(0)
  const [picked, setPicked] = useState<string[]>(['biz'])

  useEffect(() => {
    axiosClient.get('/api/catalog/best-sellers')
      .then((res) => {
        const list = (res.data.data || []) as Course[]
        setCourses(list)
        setLearners(list.reduce((sum, c) => sum + Number(c.enrollmentCount || 0), 0))
      })
      .catch((err) => setError(err.response?.data?.message || 'Không kết nối được Gateway. Hãy chạy backend trước.'))
    axiosClient.get('/api/catalog/courses?size=1')
      .then((res) => setCourseCount(Number(res.data.meta?.total || res.data.data?.length || 0)))
      .catch(() => {})
    axiosClient.get('/api/catalog/categories')
      .then((res) => setCategoryCount((res.data.data || []).length))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!courses.length) return
    let cancelled = false
    const ranked = rankInstructors(courses, 8)
    if (!ranked.length) {
      setInstructors([])
      setInstructorsReady(true)
      return
    }
    Promise.all(
      ranked.map((r) =>
        axiosClient
          .get(`/api/users/${r.instructorId}/public`)
          .then((x) => x.data.data as { id: number; fullName: string; headline?: string } | null)
          .catch(() => null),
      ),
    ).then((profiles) => {
      if (cancelled) return
      setInstructors(
        ranked.map((r, i) => {
          const p = profiles[i]
          const avg = r.ratingCount ? r.weighted / r.ratingCount : 0
          return {
            id: r.instructorId,
            fullName: p?.fullName || (vi ? `Giảng viên #${r.instructorId}` : `Instructor #${r.instructorId}`),
            headline: p?.headline || (vi ? 'Giảng viên LearnHub' : 'LearnHub instructor'),
            ratingAvg: Math.round(avg * 10) / 10,
            ratingCount: r.ratingCount,
            courseCount: r.courseCount,
            enrollments: r.enrollments,
            topCourseSlug: r.bestCourse?.slug,
            topCategory: r.bestCourse?.categoryName,
          }
        }),
      )
      setInstructorsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [courses, vi])

  const toggleGoal = (id: string) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const explorePicked = () => {
    const first = GOALS.find((g) => picked.includes(g.id))
    navigate(first ? `/courses?q=${encodeURIComponent(first.q)}` : '/courses')
  }

  const mosaic = courses.slice(0, 5)
  while (mosaic.length < 5) {
    mosaic.push({
      id: -mosaic.length,
      slug: '',
      title: t('getLearnHub'),
      subtitle: '',
      price: 0,
      categoryName: 'LearnHub',
      ratingAvg: 0,
    })
  }

  return (
    <>
      <LearningAtmosphere />
      <div className="page page-home">
        <section className="hero hero-split">
          <div className="hero-copy">
            <p className="hero-kicker">{vi ? 'Nền tảng học tập trực tuyến' : 'Online learning platform'}</p>
            <h1>{t('heroTitle')}</h1>
            <div className="mc-accent" />
            <div className="mc-goals">
              {GOALS.map((g) => (
                <label key={g.id} className={`mc-goal${picked.includes(g.id) ? ' on' : ''}`}>
                  <input type="checkbox" checked={picked.includes(g.id)} onChange={() => toggleGoal(g.id)} />
                  {t(g.key)}
                </label>
              ))}
            </div>
            <p style={{ marginTop: 18 }}>
              <button type="button" onClick={explorePicked}>{t('explore')}</button>
            </p>
          </div>
          <div className="hero-visual hero-visual-stage">
            <div className="mc-mosaic">
              {mosaic.map((c) => (
                c.slug
                  ? <Link key={c.id} to={`/courses/${c.slug}`} className="mc-tile">{c.categoryName || c.title}</Link>
                  : <div key={c.id} className="mc-tile">{c.categoryName}</div>
              ))}
            </div>
            <HeroGlassStage />
          </div>
        </section>

        <section className="mc-member">
          <div>
            <h2>{t('membershipTitle')}</h2>
            <ul className="mc-benefits">
              <li>{t('benefit1')}</li>
              <li>{t('benefit2')}</li>
              <li>{t('benefit3')}</li>
              <li>{t('benefit4')}</li>
            </ul>
            <p style={{ marginTop: 22 }}>
              <Link to="/register"><button>{t('getLearnHub')}</button></Link>
            </p>
            <StudySparkRow />
          </div>
          <div className="mc-member-visual" aria-hidden="true">
            <div className="mc-member-glow" />
            <div className="mc-member-tiles">
              <div className="mc-tile">LearnHub</div>
              <div className="mc-tile">Studio</div>
            </div>
          </div>
        </section>

        <Overview3D
          title={t('overview')}
          stats={[
            { label: t('statCourses'), value: String(courseCount || courses.length || '—'), hint: vi ? 'Đang mở trên catalog' : 'Live on the catalog' },
            { label: t('statCategories'), value: String(categoryCount || '—'), hint: vi ? 'Lĩnh vực đa dạng' : 'Topic areas' },
            { label: t('students'), value: learners ? learners.toLocaleString('vi-VN') : '—', hint: vi ? 'Lượt đăng ký các khóa bán chạy' : 'Enrollments on best sellers' },
            { label: t('lifetime'), value: '100%', hint: vi ? 'Mua một lần, học mãi' : 'Pay once, keep forever' },
          ]}
        />

        {error && <p className="err">{error}</p>}
        <CourseBookshelf />
        <h2 className="mc-headline">{t('meetBest')}</h2>
        <div className="grid">
          {instructors.map((ins) => (
            <TiltCard
              key={ins.id}
              to={ins.topCourseSlug ? `/courses/${ins.topCourseSlug}` : '/courses'}
            >
              <div className="thumb">{ins.topCategory || (vi ? 'Giảng viên' : 'Instructor')}</div>
              <div className="body">
                <strong>{ins.fullName}</strong>
                <p className="muted">{ins.headline}</p>
                <div className="price">
                  {ins.ratingAvg > 0
                    ? `${ins.ratingAvg.toFixed(1)} ★ · ${ins.courseCount} ${vi ? 'khóa' : 'courses'}`
                    : `${ins.courseCount} ${vi ? 'khóa' : 'courses'}${ins.enrollments ? ` · ${ins.enrollments.toLocaleString(vi ? 'vi-VN' : 'en')} ${vi ? 'học viên' : 'learners'}` : ''}`}
                </div>
              </div>
            </TiltCard>
          ))}
          {!instructors.length && (
            <p className="muted" style={{ gridColumn: '1 / -1' }}>
              {instructorsReady
                ? (vi ? 'Chưa có dữ liệu giảng viên.' : 'No instructors yet.')
                : (vi ? 'Đang tải danh sách giảng viên…' : 'Loading instructors…')}
            </p>
          )}
        </div>
      </div>
      <footer className="footer">© {new Date().getFullYear()} LearnHub</footer>
    </>
  )
}
