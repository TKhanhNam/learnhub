import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { HOT_COURSE_LIMIT, fetchHotCourses, recordCourseClick } from '../lib/coursePopularity'

export type ShelfCourse = {
  id: number
  slug: string
  title: string
  subtitle?: string
  description?: string
  categoryName?: string
  price?: number
}

type Lecture = { id: number; title: string }

declare global {
  interface Window {
    __LEARNHUB_SHELF_BOOKS__?: ReturnType<typeof coursesToBooks>
  }
}

const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

const TEMPLATES = [
  { color: '#182a43', foil: '#c87046', motifKey: 'brackets', motif: 'Nested brackets', width: 1.02, height: 1.58, depth: 0.26, seed: 11, palette: { paper: '#171a24', paperDeep: '#10131b', paperPale: '#f1eadf', ink: '#f4eee6', inkSoft: '#b9b4ae', wall: '#171a24', shelf: '#3a2118', shelfDark: '#1c0e0a', light: '#f4d7b9', fill: '#9fb3c9' }, paletteLabel: 'Ultramarine · bone · copper' },
  { color: '#c24d24', foil: '#efc16d', motifKey: 'paths', motif: 'Interlaced paths', width: 1.0, height: 1.48, depth: 0.24, seed: 22, palette: { paper: '#762f1b', paperDeep: '#572113', paperPale: '#ffe4c5', ink: '#fff0df', inkSoft: '#e3bfa8', wall: '#762f1b', shelf: '#402015', shelfDark: '#1d0d08', light: '#ffd19a', fill: '#dc8c6b' }, paletteLabel: 'Burnt orange · cream · burgundy' },
  { color: '#1f3d2f', foil: '#d6c39a', motifKey: 'nodes', motif: 'Linked nodes', width: 1.05, height: 1.55, depth: 0.28, seed: 33, palette: { paper: '#1f3d2f', paperDeep: '#14281f', paperPale: '#e8f0e4', ink: '#f3f7f1', inkSoft: '#b7c4b4', wall: '#1f3d2f', shelf: '#2c2118', shelfDark: '#15100c', light: '#e4d2a8', fill: '#8faf9a' }, paletteLabel: 'Forest · parchment · brass' },
  { color: '#2b2140', foil: '#c9a8e8', motifKey: 'orbit', motif: 'Orbital rings', width: 0.98, height: 1.52, depth: 0.25, seed: 44, palette: { paper: '#2b2140', paperDeep: '#1a1428', paperPale: '#efe8f8', ink: '#f7f2ff', inkSoft: '#c4b8d6', wall: '#2b2140', shelf: '#3a2a1c', shelfDark: '#1a120c', light: '#e8d4ff', fill: '#a896c9' }, paletteLabel: 'Violet · mist · silver' },
  { color: '#0f3a4a', foil: '#7dd3c0', motifKey: 'wave', motif: 'Tidal marks', width: 1.04, height: 1.5, depth: 0.27, seed: 55, palette: { paper: '#0f3a4a', paperDeep: '#0a2833', paperPale: '#e4f4f2', ink: '#f0faf8', inkSoft: '#a8c4c0', wall: '#0f3a4a', shelf: '#332418', shelfDark: '#1a110c', light: '#b8efe4', fill: '#6aa8b0' }, paletteLabel: 'Teal · foam · pewter' },
  { color: '#4a1d2e', foil: '#f0b7a0', motifKey: 'flame', motif: 'Warm glyph', width: 1.01, height: 1.56, depth: 0.26, seed: 66, palette: { paper: '#4a1d2e', paperDeep: '#32141f', paperPale: '#fceee8', ink: '#fff6f2', inkSoft: '#d4b0a8', wall: '#4a1d2e', shelf: '#3a2418', shelfDark: '#1c100c', light: '#ffd0c0', fill: '#c4848e' }, paletteLabel: 'Rosewood · blush · gold' },
  { color: '#1c2a1c', foil: '#c5d48a', motifKey: 'leaf', motif: 'Leaf lattice', width: 0.99, height: 1.46, depth: 0.23, seed: 77, palette: { paper: '#1c2a1c', paperDeep: '#121c12', paperPale: '#eef3e4', ink: '#f5f9ec', inkSoft: '#b6c2a4', wall: '#1c2a1c', shelf: '#2e2218', shelfDark: '#16100c', light: '#dde8b0', fill: '#8aa078' }, paletteLabel: 'Olive · linen · chartreuse' },
] as const

function coursesToBooks(courses: ShelfCourse[]) {
  return courses.slice(0, HOT_COURSE_LIMIT).map((c, i) => {
    const t = TEMPLATES[i % TEMPLATES.length]
    const short = c.title.length > 40 ? `${c.title.slice(0, 38)}…` : c.title
    const price = Number(c.price)
    return {
      id: c.slug || `course-${c.id}`,
      title: short,
      roman: ROMANS[i] || String(i + 1),
      discipline: c.categoryName || 'LearnHub',
      note: (c.subtitle || c.categoryName || 'Khóa học LearnHub').slice(0, 90),
      deck: (c.subtitle || c.description || `Khóa học ${c.categoryName || ''} trên LearnHub`).slice(0, 220),
      binding: 'LearnHub cloth · foil stamp',
      format: 'Digital edition · LearnHub',
      theme: `${c.categoryName || 'LearnHub'} · học trực tuyến`,
      motif: t.motif,
      motifKey: t.motifKey,
      paletteLabel: t.paletteLabel,
      color: t.color,
      foil: t.foil,
      palette: t.palette,
      width: t.width,
      height: t.height,
      depth: t.depth,
      chapters: ['Giới thiệu', 'Nội dung', 'Mua khóa học'],
      seed: t.seed + c.id * 17,
      slug: c.slug,
      courseId: c.id,
      price: Number.isFinite(price) ? price : 0,
    }
  })
}

/**
 * Complete Shelf (ThreeUI / Three.js r165) — 7 khóa truy cập nhiều nhất = 7 quyển.
 * iframe same-origin + local three để chạy WebGL đúng như video.
 */
export default function CourseBookshelf() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [courses, setCourses] = useState<ShelfCourse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [focus, setFocus] = useState<ShelfCourse | null>(null)
  const [picked, setPicked] = useState<number[]>([])
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const books = useMemo(() => coursesToBooks(courses), [courses])

  // Same-origin iframe reads this during boot — set synchronously before paint.
  if (typeof window !== 'undefined') {
    window.__LEARNHUB_SHELF_BOOKS__ = books
  }

  useEffect(() => {
    let cancelled = false
    fetchHotCourses(HOT_COURSE_LIMIT)
      .then((list) => {
        if (cancelled) return
        const shelf = list as ShelfCourse[]
        if (!shelf.length) setError('Chưa có khóa học trong database.')
        setCourses(shelf)
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được khóa học.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!e.data || e.data.type !== 'learnhub-shelf-select') return
      const course = courses.find((c) => c.slug === e.data.slug || c.id === e.data.courseId) || null
      if (!course) return
      setFocus((prev) => {
        if (!prev || prev.id !== course.id) {
          recordCourseClick(course)
          setPicked((p) => (p.includes(course.id) ? p : [...p, course.id]))
        }
        return course
      })
      if (e.data.openToc === true) setTocOpen(true)
      if (e.data.checkout === true) {
        void goToCheckout(course)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [courses, isAuthenticated])

  useEffect(() => {
    if (!tocOpen || !focus) return
    setLectures([])
    fetch(`/api/content/courses/${focus.id}/curriculum`)
      .then((r) => r.json())
      .then((body) => setLectures(body.data?.lectures || []))
      .catch(() => setLectures([]))
  }, [tocOpen, focus])

  const togglePick = (id: number) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  /** Thêm khóa vào giỏ rồi mở trang thanh toán (/cart). */
  const goToCheckout = async (course: ShelfCourse) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (busy) return
    setBusy(true)
    setToast(null)
    try {
      await axiosClient.post('/api/commerce/cart', { courseId: course.id })
      navigate('/cart')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setToast(msg || 'Không chuyển được sang thanh toán.')
      setBusy(false)
    }
  }

  const addPickedToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!picked.length) return
    setBusy(true)
    setToast(null)
    try {
      for (const id of picked) {
        await axiosClient.post('/api/commerce/cart', { courseId: id })
      }
      setToast(`Đã thêm ${picked.length} khóa vào giỏ.`)
      setTimeout(() => navigate('/cart'), 700)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setToast(msg || 'Không thêm được vào giỏ.')
    } finally {
      setBusy(false)
    }
  }

  const priceLabel = (c: ShelfCourse | null) =>
    c ? `${Number(c.price || 0).toLocaleString('vi-VN')} ₫` : ''

  return (
    <section className="course-shelf">
      <div className="course-shelf-head">
        <p className="hero-kicker">Thư viện 3D · Top {HOT_COURSE_LIMIT} truy cập nhiều nhất</p>
        <h2>Mỗi khóa học là một quyển sách</h2>
      </div>

      <div className="shader-frame course-shelf-frame">
        {books.length ? (
          <iframe
            key={books.map((b) => b.id).join('|')}
            title="Thư viện LearnHub 3D"
            src={`/landing-pages/complete-shelf-v2.html?courses=${books.length}&v=title`}
            allow="fullscreen"
            loading="eager"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#080808' }}
          />
        ) : (
          <div className="course-shelf-loading">{error || 'Đang tải 7 khóa học truy cập nhiều nhất…'}</div>
        )}
      </div>

      <div className="course-shelf-actions">
        <button type="button" onClick={() => focus && setTocOpen(true)} disabled={!focus}>
          {focus ? `Mục lục · ${focus.title}` : 'Chọn một quyển trên kệ'}
        </button>
        <Link to="/courses"><button type="button" className="ghost">Danh sách khóa học</button></Link>
      </div>

      {tocOpen && focus && (
        <div className="shelf-toc-modal" role="dialog" aria-modal="true">
          <div className="shelf-toc-card">
            <header className="shelf-toc-head">
              <div>
                <p className="hero-kicker">Mục lục · Thanh toán</p>
                <h3>{focus.title}</h3>
                <p className="muted">{focus.subtitle || focus.categoryName} · {priceLabel(focus)}</p>
              </div>
              <button type="button" className="ghost" onClick={() => setTocOpen(false)}>Đóng</button>
            </header>

            <div className="shelf-toc-grid">
              <div>
                <h4>Nội dung khóa đang chọn</h4>
                <ul className="shelf-toc-list">
                  {lectures.length ? lectures.map((l) => (
                    <li key={l.id}>{l.title}</li>
                  )) : (
                    <li className="muted">Chưa có bài giảng công khai — vẫn có thể thanh toán khóa học.</li>
                  )}
                </ul>
                <p style={{ marginTop: 12 }}>
                  <Link to={`/courses/${focus.slug}`}>Xem trang khóa học →</Link>
                </p>
                <button
                  type="button"
                  className="shelf-buy-btn"
                  style={{ marginTop: 16, width: '100%' }}
                  onClick={() => goToCheckout(focus)}
                  disabled={busy}
                >
                  {busy ? 'Đang chuyển…' : `Thanh toán · ${priceLabel(focus)}`}
                </button>
              </div>

              <div>
                <h4>Top {HOT_COURSE_LIMIT} trên kệ — chọn thêm</h4>
                <p className="muted" style={{ marginBottom: 10 }}>Tích các khóa muốn mua cùng lúc.</p>
                <ul className="shelf-toc-checks">
                  {books.map((b) => {
                    const full = courses.find((c) => c.id === b.courseId)!
                    return (
                      <li key={b.courseId}>
                        <label>
                          <input
                            type="checkbox"
                            checked={picked.includes(b.courseId)}
                            onChange={() => togglePick(b.courseId)}
                          />
                          <span>
                            <strong>{full.title}</strong>
                            <small>{Number(full.price || 0).toLocaleString('vi-VN')} ₫ · {full.categoryName}</small>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            <footer className="shelf-toc-foot">
              {toast && <p className={toast.includes('Đã thêm') || toast.includes('Đang') ? 'ok' : 'err'}>{toast}</p>}
              <button type="button" onClick={() => goToCheckout(focus)} disabled={busy}>
                {busy ? 'Đang chuyển…' : `Thanh toán “${focus.title.slice(0, 28)}${focus.title.length > 28 ? '…' : ''}”`}
              </button>
              <button type="button" className="ghost" onClick={addPickedToCart} disabled={busy || picked.length === 0}>
                {busy ? 'Đang thêm…' : `Thêm ${picked.length} khóa vào giỏ`}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  )
}
