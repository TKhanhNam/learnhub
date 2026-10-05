import { FormEvent, useEffect, useRef, useState } from 'react'
import axiosClient from '../api/axiosClient'
import QaPanel from '../components/QaPanel'

interface Course { id: number; title: string; status: string; price: number }
interface Coupon { id: number; code: string; discountPercent: number; maxUses: number; usedCount: number; active: boolean }
interface Review { id: number; authorName: string; rating: number; comment: string; instructorReply?: string }
interface Submission { id: number; assignmentId: number; studentId: number; linkUrl: string; status: string; score?: number; feedback?: string }
interface Stats { totalEnrollments: number; completedEnrollments: number; averageProgress: number }

type Tab = 'courses' | 'content' | 'coupons' | 'analytics' | 'qa' | 'reviews' | 'grade'

export default function StudioPage() {
  const [tab, setTab] = useState<Tab>('courses')
  const [courses, setCourses] = useState<Course[]>([])
  const [title, setTitle] = useState('Khóa học mới')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('199000')
  const [msg, setMsg] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const selectedCardRef = useRef<HTMLDivElement | null>(null)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [categoryId, setCategoryId] = useState<number>(1)
  const [payout, setPayout] = useState<{ gross: number; platformFee: number; net: number } | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [lectureTitle, setLectureTitle] = useState('Bài giảng video')
  const [quizTitle, setQuizTitle] = useState('Quiz kiểm tra')
  const [asgTitle, setAsgTitle] = useState('Bài tập nộp link')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [couponCode, setCouponCode] = useState('GV10')
  const [couponPct, setCouponPct] = useState('10')
  const [reviews, setReviews] = useState<Review[]>([])
  const [reply, setReply] = useState('')
  const [subs, setSubs] = useState<Submission[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  const load = (preferId?: number) => {
    setListLoading(true)
    axiosClient.get('/api/catalog/instructor/courses?size=200&sort=id,desc').then((res) => {
      const raw = res.data?.data
      const list = (Array.isArray(raw) ? raw : []) as Course[]
      setCourses(list)
      const draft = list.find((c) => c.status === 'DRAFT' || c.status === 'REJECTED')
      const next = preferId || selected || draft?.id || list[0]?.id
      if (next) setSelected(next)
    }).catch(() => setMsg('Không tải được danh sách khóa. Kiểm tra đăng nhập giảng viên.'))
      .finally(() => setListLoading(false))
    axiosClient.get('/api/commerce/instructor/payouts').then((res) => {
      const d = res.data.data
      setPayout({
        gross: Number(d.gross) || 0,
        platformFee: Number(d.platformFee) || 0,
        net: Number(d.net) || 0,
      })
    }).catch(() => {})
    axiosClient.get('/api/catalog/coupons').then((res) => setCoupons(res.data.data || [])).catch(() => {})
  }

  useEffect(() => {
    axiosClient.get('/api/catalog/categories').then((res) => {
      setCategories(res.data.data || [])
      if (res.data.data?.[0]) setCategoryId(res.data.data[0].id)
    })
    load()
  }, [])

  useEffect(() => {
    if (!selected) return
    selectedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    axiosClient.get(`/api/social/reviews?courseId=${selected}`).then((r) => setReviews(r.data.data || [])).catch(() => {})
    axiosClient.get(`/api/learning/instructor/submissions?courseId=${selected}`).then((r) => setSubs(r.data.data || [])).catch(() => setSubs([]))
    axiosClient.get(`/api/learning/instructor/stats?courseIds=${selected}`).then((r) => setStats(r.data.data)).catch(() => {})
  }, [selected])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'courses', label: 'Khóa & giá' },
    { id: 'content', label: 'Bài giảng / quiz' },
    { id: 'coupons', label: 'Coupon cá nhân' },
    { id: 'analytics', label: 'Dashboard' },
    { id: 'qa', label: 'Q&A' },
    { id: 'reviews', label: 'Review' },
    { id: 'grade', label: 'Chấm bài' },
  ]

  const statusLabel = (status: string) => {
    if (status === 'DRAFT') return 'Nháp — chưa gửi duyệt'
    if (status === 'PENDING') return 'Đang chờ admin duyệt'
    if (status === 'REJECTED') return 'Bị từ chối — gửi lại được'
    if (status === 'PUBLISHED') return 'Đã xuất bản'
    return status
  }

  const createCourse = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    try {
      const res = await axiosClient.post('/api/catalog/courses', {
        title, subtitle: title.trim(), description: description.trim(), categoryId,
        price: Number(price), level: 'BEGINNER', language: 'vi', skills: ['Demo'],
      })
      const created = res.data.data as Course
      setSelected(created.id)
      setMsg(`Đã tạo khóa nháp “${created.title}” (#${created.id}). Gửi duyệt cho admin ở khung bên dưới.`)
      load(created.id)
    } catch (err: unknown) {
      const text = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsg(text || 'Không tạo được khóa nháp.')
    }
  }

  const selectCourse = (course: Course) => {
    setSelected(course.id)
    setTab('courses')
    setMsg(
      course.status === 'DRAFT' || course.status === 'REJECTED'
        ? `Đang chọn “${course.title}”. Bấm Gửi duyệt để admin xét.`
        : `Đang chọn “${course.title}” · ${statusLabel(course.status)}`,
    )
  }

  const submitReview = async (course: Course) => {
    setMsg(null)
    try {
      await axiosClient.patch(`/api/catalog/courses/${course.id}/submit`)
      setMsg(`Đã gửi “${course.title}” cho admin duyệt.`)
      load(course.id)
    } catch (err: unknown) {
      const text = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsg(text || 'Không gửi duyệt được.')
    }
  }

  const deleteCourse = async (course: Course) => {
    if (!window.confirm(`Xóa khóa “${course.title}”? Không hoàn tác được.`)) return
    setMsg(null)
    try {
      await axiosClient.delete(`/api/catalog/courses/${course.id}`)
      setMsg(`Đã xóa “${course.title}”.`)
      if (selected === course.id) setSelected(null)
      load()
    } catch (err: unknown) {
      const text = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsg(text || 'Không xóa được khóa này.')
    }
  }

  const focused = courses.find((c) => c.id === selected) || null
  const vnd = (n: number) => `${Number(n).toLocaleString('vi-VN')} ₫`
  const tone = (status: string) => {
    if (status === 'PUBLISHED') return 'ok'
    if (status === 'PENDING') return 'wait'
    if (status === 'REJECTED') return 'bad'
    return 'draft'
  }

  return (
    <div className="page studio">
      <header className="studio-head">
        <p className="studio-kicker">Giảng viên</p>
        <h1>Studio</h1>
        <p className="muted">Soạn khóa, theo dõi doanh thu và phản hồi học viên. Sàn giữ 30%, giảng viên nhận 70%.</p>
      </header>

      <div className="studio-kpis">
        <article className="studio-kpi">
          <span>Doanh thu</span>
          <strong>{payout ? vnd(payout.gross) : '—'}</strong>
        </article>
        <article className="studio-kpi">
          <span>Phí sàn 30%</span>
          <strong>{payout ? vnd(payout.platformFee) : '—'}</strong>
        </article>
        <article className="studio-kpi accent">
          <span>Thực lĩnh 70%</span>
          <strong>{payout ? vnd(payout.net) : '—'}</strong>
        </article>
      </div>

      <div className="studio-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`studio-tab${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'courses' && (
        <>
          <div className="studio-split">
            <form onSubmit={createCourse} className="studio-panel">
              <h2>Tạo khóa mới</h2>
              <p className="muted">Khóa được lưu dạng nháp, rồi gửi admin duyệt.</p>
              <label htmlFor="studio-title">Tên khóa</label>
              <input id="studio-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <label htmlFor="studio-desc">Mô tả khóa học</label>
              <textarea
                id="studio-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Giới thiệu khóa học sẽ dạy gì. Có thể để trống."
              />
              <label htmlFor="studio-price">Giá (₫)</label>
              <input id="studio-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
              <label htmlFor="studio-cat">Danh mục</label>
              <select id="studio-cat" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit">Tạo khóa nháp</button>
            </form>

            <aside ref={selectedCardRef} className="studio-panel studio-focus">
              {focused ? (
                <>
                  <p className="studio-kicker">Khóa đang chọn</p>
                  <h2>{focused.title}</h2>
                  <div className="studio-meta">
                    <span className={`studio-badge ${tone(focused.status)}`}>{statusLabel(focused.status)}</span>
                    <span>#{focused.id}</span>
                    <strong>{vnd(focused.price)}</strong>
                  </div>
                  {focused.status === 'PENDING' && <p className="muted">Đã gửi — chờ admin duyệt.</p>}
                  {focused.status === 'PUBLISHED' && <p className="muted">Admin đã duyệt, khóa đang bán.</p>}
                  <div className="studio-actions">
                    {(focused.status === 'DRAFT' || focused.status === 'REJECTED') && (
                      <button type="button" onClick={() => submitReview(focused)}>Gửi duyệt cho admin</button>
                    )}
                    <button type="button" className="ghost" onClick={() => setTab('content')}>Soạn bài giảng</button>
                    <button type="button" className="danger" onClick={() => deleteCourse(focused)}>Xóa</button>
                  </div>
                </>
              ) : (
                <p className="muted">Chọn một khóa bên dưới để soạn, gửi duyệt hoặc xóa.</p>
              )}
            </aside>
          </div>
          {msg && <p className="studio-note">{msg}</p>}

          <h2 className="studio-section">Khóa của bạn</h2>
          {listLoading && <p className="muted">Đang tải danh sách khóa…</p>}
          <div className="studio-grid">
            {courses.map((c) => (
              <article key={c.id} className={`studio-course${selected === c.id ? ' is-on' : ''}`}>
                <button type="button" className="studio-course-main" onClick={() => selectCourse(c)}>
                  <span className={`studio-badge ${tone(c.status)}`}>{statusLabel(c.status)}</span>
                  <strong>{c.title}</strong>
                  <span className="studio-price">{vnd(c.price)}</span>
                </button>
                <div className="studio-actions">
                  <button type="button" className="ghost" onClick={() => selectCourse(c)}>
                    {selected === c.id ? 'Đang chọn' : 'Chọn'}
                  </button>
                  {(c.status === 'DRAFT' || c.status === 'REJECTED') && (
                    <button type="button" onClick={() => submitReview(c)}>Gửi duyệt</button>
                  )}
                  <button type="button" className="danger" onClick={() => deleteCourse(c)}>Xóa</button>
                </div>
              </article>
            ))}
          </div>
          {!listLoading && courses.length === 0 && (
            <p className="studio-empty">Chưa có khóa. Tạo khóa nháp ở form phía trên.</p>
          )}
        </>
      )}

      {tab === 'content' && !selected && <p className="studio-empty">Chọn một khóa ở tab Khóa & giá trước khi soạn bài.</p>}
      {tab === 'content' && selected && (
        <div className="studio-stack">
          <p className="muted">Khóa đang soạn: #{selected}{focused ? ` · ${focused.title}` : ''}</p>
          <section className="studio-panel">
          <h2>Bài giảng</h2>
          <p className="muted">Video, văn bản hoặc slide.</p>
          <div className="row">
            <input className="grow" value={lectureTitle} onChange={(e) => setLectureTitle(e.target.value)} />
            <button onClick={async () => {
              await axiosClient.post(`/api/content/courses/${selected}/lectures`, {
                title: lectureTitle, type: 'VIDEO', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
                durationSeconds: 90, downloadUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              })
              setMsg('Đã thêm bài giảng video + tài liệu tải về')
            }}>+ video</button>
            <button className="ghost" onClick={async () => {
              await axiosClient.post(`/api/content/courses/${selected}/lectures`, {
                title: lectureTitle, type: 'TEXT', bodyHtml: '<p>Slide / tài liệu tóm tắt.</p>', durationSeconds: 180,
              })
              setMsg('Đã thêm bài văn bản / slide')
            }}>+ slide/text</button>
          </div>
          </section>
          <section className="studio-panel">
          <h2>Quiz và practice test</h2>
          <div className="row">
            <input className="grow" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
            <button onClick={async () => {
              await axiosClient.post(`/api/content/courses/${selected}/quizzes`, {
                title: quizTitle, kind: 'QUIZ', passScore: 70,
                questions: [{ prompt: 'Câu hỏi demo?', optionA: 'Sai', optionB: 'Đúng', optionC: 'Không rõ', optionD: 'Bỏ qua', correctOption: 'B' }],
              })
              setMsg('Đã tạo quiz')
            }}>+ quiz</button>
            <button className="ghost" onClick={async () => {
              await axiosClient.post(`/api/content/courses/${selected}/quizzes`, {
                title: quizTitle + ' (practice)', kind: 'PRACTICE', passScore: 80,
                questions: [{ prompt: 'Practice: Gateway nằm ở đâu?', optionA: 'Từng service', optionB: 'Điểm vào duy nhất', optionC: 'MySQL', optionD: 'MinIO', correctOption: 'B' }],
              })
              setMsg('Đã tạo practice test')
            }}>+ practice</button>
          </div>
          </section>
          <section className="studio-panel">
          <h2>Bài tập và coding</h2>
          <p className="muted">Học viên nộp bằng link.</p>
          <div className="row">
            <input className="grow" value={asgTitle} onChange={(e) => setAsgTitle(e.target.value)} />
            <button onClick={async () => {
              await axiosClient.post(`/api/content/courses/${selected}/assignments`, {
                title: asgTitle, instruction: 'Nộp link GitHub hoặc Google Drive.',
              })
              setMsg('Đã tạo bài tập')
            }}>+ assignment</button>
            <button className="ghost" onClick={async () => {
              await axiosClient.post(`/api/content/courses/${selected}/assignments`, {
                title: 'Coding exercise', instruction: 'Làm bài coding, đẩy GitHub public, dán link repo.',
              })
              setMsg('Đã tạo coding exercise')
            }}>+ coding</button>
          </div>
          </section>
        </div>
      )}

      {tab === 'coupons' && (
        <section className="studio-panel">
          <h2>Mã giảm giá cá nhân</h2>
          <div className="row">
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Mã, ví dụ GV10" />
            <input className="studio-pct" value={couponPct} onChange={(e) => setCouponPct(e.target.value)} aria-label="Phần trăm giảm" />
            <button onClick={async () => {
              await axiosClient.post('/api/catalog/coupons', {
                code: couponCode, courseId: selected, discountPercent: Number(couponPct), maxUses: 50,
              })
              load()
            }}>Tạo coupon</button>
          </div>
          <div className="studio-grid">
            {coupons.map((c) => (
              <article key={c.id} className="studio-course">
                <strong>{c.code}</strong>
                <span className="studio-price">-{c.discountPercent}%</span>
                <span className="muted">{c.usedCount}/{c.maxUses} lượt · {c.active ? 'Đang bật' : 'Đã ngưng'}</span>
                {c.active && <button className="ghost" onClick={async () => { await axiosClient.delete(`/api/catalog/coupons/${c.id}`); load() }}>Ngưng</button>}
              </article>
            ))}
          </div>
          {coupons.length === 0 && <p className="studio-empty">Chưa có mã giảm giá.</p>}
        </section>
      )}

      {tab === 'analytics' && (
        <section className="studio-panel">
          <h2>Dashboard khóa</h2>
          <div className="studio-kpis">
            <article className="studio-kpi">
              <span>Đăng ký</span>
              <strong>{stats ? stats.totalEnrollments : '—'}</strong>
            </article>
            <article className="studio-kpi">
              <span>Hoàn thành</span>
              <strong>{stats ? stats.completedEnrollments : '—'}</strong>
            </article>
            <article className="studio-kpi accent">
              <span>Tiến độ trung bình</span>
              <strong>{stats ? `${(stats.averageProgress || 0).toFixed(1)}%` : '—'}</strong>
            </article>
          </div>
          {selected && <p className="muted">Review khóa #{selected}: {reviews.length} lượt</p>}
        </section>
      )}

      {tab === 'qa' && !selected && <p className="studio-empty">Chọn một khóa để xem câu hỏi.</p>}
      {tab === 'qa' && selected && (
        <section className="studio-panel">
          <QaPanel courseId={selected} canPost={false} canAnswer vi />
        </section>
      )}

      {tab === 'reviews' && !selected && <p className="studio-empty">Chọn một khóa để xem review.</p>}
      {tab === 'reviews' && selected && (
        <section className="studio-stack">
          <h2 className="studio-section">Phản hồi review</h2>
          {reviews.map((r) => (
            <article key={r.id} className="studio-panel">
              <strong>{r.authorName}</strong> · {r.rating}/5
              <p>{r.comment}</p>
              {r.instructorReply && <p className="muted">Đã trả lời: {r.instructorReply}</p>}
              <div className="row">
                <input className="grow" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Viết phản hồi..." />
                <button className="ghost" onClick={async () => {
                  await axiosClient.post(`/api/social/reviews/${r.id}/reply`, { body: reply })
                  setReply('')
                  const x = await axiosClient.get(`/api/social/reviews?courseId=${selected}`)
                  setReviews(x.data.data || [])
                }}>Gửi</button>
              </div>
            </article>
          ))}
          {reviews.length === 0 && <p className="studio-empty">Khóa này chưa có review.</p>}
        </section>
      )}

      {tab === 'grade' && !selected && <p className="studio-empty">Chọn một khóa để chấm bài.</p>}
      {tab === 'grade' && selected && (
        <section className="studio-stack">
          <h2 className="studio-section">Chấm bài tập</h2>
          {subs.map((s) => (
            <article key={s.id} className="studio-panel">
              <p>HV #{s.studentId} · <a href={s.linkUrl} target="_blank" rel="noreferrer">{s.linkUrl}</a> · {s.status}</p>
              <button className="ghost" onClick={async () => {
                await axiosClient.post(`/api/learning/instructor/submissions/${s.id}/grade`, { score: 90, feedback: 'Tốt' })
                const x = await axiosClient.get(`/api/learning/instructor/submissions?courseId=${selected}`)
                setSubs(x.data.data || [])
              }}>Chấm 90</button>
            </article>
          ))}
          {subs.length === 0 && <p className="studio-empty">Chưa có bài nộp.</p>}
        </section>
      )}
      {tab !== 'courses' && msg && <p className="studio-note">{msg}</p>}
    </div>
  )
}
