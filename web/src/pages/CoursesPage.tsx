import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import { SUBJECTS } from '../data/subjects'
import { HOT_COURSE_LIMIT, localTopCourses, mergeHotList, recordCourseClick, recordSearchHits, fetchHotCourses } from '../lib/coursePopularity'

function mergeHotCourses(server: Course[], localPreferred: ReturnType<typeof localTopCourses>): Course[] {
  return mergeHotList(server, localPreferred, HOT_COURSE_LIMIT) as Course[]
}

interface Course {
  id: number
  slug: string
  title: string
  subtitle: string
  price: number
  categoryName: string
  level: string
  ratingAvg?: number
  ratingCount?: number
  enrollmentCount?: number
}

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

function CourseCard({ course, featured, t, vi, onOpen }: {
  course: Course
  featured?: boolean
  t: (key: 'bestSeller' | 'aCourseBy' | 'buy' | 'isNew') => string
  vi: boolean
  onOpen?: (course: Course) => void
}) {
  const students = Number(course.enrollmentCount || 0)
  const ratings = Number(course.ratingCount || 0)
  const pct = ratings ? Math.round((Number(course.ratingAvg || 0) / 5) * 100) : 0
  const track = () => onOpen?.(course)
  return (
    <article className={`dx-card${featured ? ' featured' : ''}`}>
      <Link to={`/courses/${course.slug}`} className="dx-cover" style={{ background: coverFor(course.id) }} onClick={track}>
        {(featured || students > 50) && <span className="dx-badge">{t('bestSeller')}</span>}
        <span className="dx-cover-label">{course.categoryName}</span>
      </Link>
      <div className="dx-card-body">
        <p className="dx-kicker">LearnHub · {levelLabel(course.level, vi)}</p>
        <Link to={`/courses/${course.slug}`} onClick={track}><h3>{course.title}</h3></Link>
        <p className="dx-sub">{course.subtitle}</p>
        <p className="dx-by">{t('aCourseBy')}</p>
        <div className="dx-stats">
          {students > 0
            ? <span>{students.toLocaleString(vi ? 'vi-VN' : 'en')}</span>
            : <span>{t('isNew')}</span>}
          {ratings > 0 && <span>{pct}% ({ratings})</span>}
        </div>
        <Link to={`/courses/${course.slug}`} className="dx-buy" onClick={track}>{t('buy')}</Link>
      </div>
    </article>
  )
}

export default function CoursesPage() {
  const { t, locale } = useI18n()
  const vi = locale === 'vi'
  const [params] = useSearchParams()
  const [courses, setCourses] = useState<Course[]>([])
  const [featured, setFeatured] = useState<Course[]>([])
  const [hotCourses, setHotCourses] = useState<Course[]>([])
  const [hitTick, setHitTick] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const category = params.get('category') || ''
  const keyword = params.get('q') || ''
  const view = params.get('view') || '' // new | popular | ''
  const current = SUBJECTS.find((s) => s.slug === category)
  const exploreAll = !category && !keyword && !view
  const exploreNew = view === 'new'
  const explorePopular = view === 'popular'

  const trackCourse = (course: { id: number; slug: string; title: string }) => {
    recordCourseClick(course)
    setHitTick((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        if (view === 'popular') {
          const body = await fetch(`/api/catalog/best-sellers?limit=48`).then((r) => r.json())
          if (cancelled) return
          const list = Array.isArray(body?.data) ? body.data : []
          setCourses(list)
          setFeatured([])
          if (body?.success === false) setError(body.message || 'Lỗi tải danh sách')
          return
        }

        const search = new URLSearchParams()
        if (keyword) search.set('keyword', keyword)
        if (category) search.set('category', category)
        search.set('size', '100')
        if (view === 'new') search.set('sort', 'id,desc')
        const body = await fetch(`/api/catalog/courses?${search}`).then((r) => r.json())
        if (cancelled) return
        let list: Course[] = Array.isArray(body?.data) ? body.data : []
        if (view === 'new') {
          list = [...list].sort((a, b) => Number(b.id) - Number(a.id))
        }
        setCourses(list)
        if (keyword.trim() && list.length) {
          recordSearchHits(list.slice(0, 12))
          setHitTick((n) => n + 1)
        }
        if (body?.success === false) setError(body.message || 'Lỗi tải danh sách')

        if (!category && !keyword && !view) {
          const feat = await fetch('/api/catalog/best-sellers').then((r) => r.json()).catch(() => null)
          if (!cancelled) setFeatured((Array.isArray(feat?.data) ? feat.data : []).slice(0, 3))
        } else if (!cancelled) {
          setFeatured([])
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Lỗi tải danh sách')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [category, keyword, view])

  useEffect(() => {
    let cancelled = false
    // Danh sách thịnh hành toàn cục — không phụ thuộc category đang chọn
    setHotCourses(mergeHotCourses([], localTopCourses(HOT_COURSE_LIMIT)) as Course[])

    ;(async () => {
      const list = await fetchHotCourses(HOT_COURSE_LIMIT)
      if (cancelled) return
      setHotCourses(list as Course[])
    })()

    return () => {
      cancelled = true
    }
  }, [hitTick])

  const groups = useMemo(() => {
    if (view === 'new' || view === 'popular') {
      const label = view === 'new'
        ? (vi ? 'Khóa học mới' : 'New courses')
        : (vi ? 'Khóa phổ biến' : 'Popular courses')
      return courses.length ? [[label, courses] as [string, Course[]]] : []
    }
    const map = new Map<string, Course[]>()
    courses.forEach((c) => {
      const key = c.categoryName || (vi ? 'Khác' : 'Other')
      const list = map.get(key) || []
      list.push(c)
      map.set(key, list)
    })
    return [...map.entries()]
  }, [courses, vi, view])

  const title = exploreNew
    ? (vi ? 'Khóa học mới' : 'New courses')
    : explorePopular
      ? (vi ? 'Khóa phổ biến' : 'Popular courses')
      : current
        ? `${t('onlineIn')} ${vi ? current.vi : current.en}`
        : t('coursesHero')

  const slugOf = (name: string) => SUBJECTS.find((s) => s.vi === name || s.en === name)?.slug || ''

  return (
    <div className="dx">
      <div className="dx-shell">
        <nav className="dx-crumb">
          <Link to="/">{t('home')}</Link>
          <span>/</span>
          <span>{t('courses')}</span>
        </nav>
        <div className="dx-layout">
          <aside className="dx-side">
            <div className="dx-side-panel">
              <p className="dx-side-title">{vi ? 'Khám phá' : 'Explore'}</p>
              <div className="dx-cat-frame">
                <Link to="/courses" className={exploreAll ? 'on' : ''}>
                  {t('allCourses')}
                </Link>
                <Link to="/courses?view=new" className={exploreNew ? 'on' : ''}>
                  {t('newCourses')}
                </Link>
                <Link to="/courses?view=popular" className={explorePopular ? 'on' : ''}>
                  {t('popularCourses')}
                </Link>
                <Link to="/courses?category=luyen-thi-chung-chi" className={category === 'luyen-thi-chung-chi' ? 'on' : ''}>
                  {vi ? 'Luyện thi chứng chỉ' : 'Certificate prep'}
                </Link>
              </div>
              <p className="dx-side-title">{vi ? 'Khóa học thịnh hành' : 'Trending courses'}</p>
              <div className="dx-cat-frame dx-hot-frame">
                {hotCourses.length === 0 && (
                  <p className="muted" style={{ margin: '8px 4px', fontSize: 13 }}>
                    {vi ? 'Chưa có dữ liệu truy cập.' : 'No access data yet.'}
                  </p>
                )}
                {hotCourses.map((c) => (
                  <Link
                    key={c.id}
                    to={`/courses/${c.slug}`}
                    onClick={() => trackCourse(c)}
                    title={c.title}
                  >
                    {c.title}
                  </Link>
                ))}
              </div>
              <p className="dx-side-title">{t('categories')}</p>
              <div className="dx-cat-frame">
                {SUBJECTS.map((s) => (
                  <Link
                    key={s.slug}
                    to={`/courses?category=${s.slug}`}
                    className={category === s.slug ? 'on' : ''}
                  >
                    {vi ? s.vi : s.en}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
          <main className="dx-main">
            <h1>{title}</h1>
            {loading && <p className="muted">{vi ? 'Đang tải khóa học…' : 'Loading courses…'}</p>}
            {error && <p className="err">{error}</p>}
            {!loading && !error && courses.length === 0 && (
              <p className="muted">{vi ? 'Chưa có khóa học trong mục này.' : 'No courses in this category yet.'}</p>
            )}
            {!category && !keyword && !view && featured.length > 0 && (
              <section>
                <h2>{t('featured')}</h2>
                <div className="dx-row">
                  {featured.map((c) => (
                    <CourseCard key={c.id} course={c} featured t={t} vi={vi} onOpen={trackCourse} />
                  ))}
                </div>
              </section>
            )}
            {groups.map(([name, list]) => (
              <section key={name}>
                <div className="dx-section-head">
                  <h2>{category || keyword || view ? name : `${t('onlineIn')} ${name}`}</h2>
                  {!category && !view && slugOf(name) && (
                    <Link to={`/courses?category=${slugOf(name)}`}>{t('seeMore')} →</Link>
                  )}
                </div>
                <div className="dx-row">
                  {(category || keyword || view ? list : list.slice(0, 3)).map((c) => (
                    <CourseCard key={c.id} course={c} t={t} vi={vi} onOpen={trackCourse} />
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </div>
  )
}
