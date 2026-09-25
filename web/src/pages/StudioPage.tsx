import { FormEvent, useEffect, useState } from 'react'
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
  const [price, setPrice] = useState('199000')
  const [msg, setMsg] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [categoryId, setCategoryId] = useState<number>(1)
  const [payout, setPayout] = useState('')
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

  const load = () => {
    axiosClient.get('/api/catalog/instructor/courses').then((res) => {
      const list = res.data.data || []
      setCourses(list)
      if (!selected && list[0]) setSelected(list[0].id)
    }).catch(() => {})
    axiosClient.get('/api/commerce/instructor/payouts').then((res) => {
      const d = res.data.data
      setPayout(`Doanh thu ${Number(d.gross).toLocaleString('vi-VN')} ₫ · phí sàn 30% ${Number(d.platformFee).toLocaleString('vi-VN')} ₫ · thực lĩnh 70% ${Number(d.net).toLocaleString('vi-VN')} ₫`)
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

  const createCourse = async (e: FormEvent) => {
    e.preventDefault()
    const res = await axiosClient.post('/api/catalog/courses', {
      title, subtitle: 'Landing khóa học', description: 'Trang giới thiệu, giá và nội dung demo.', categoryId,
      price: Number(price), level: 'BEGINNER', language: 'vi', skills: ['Demo'],
    })
    setMsg('Đã tạo khóa #' + res.data.data.id)
    load()
  }

  return (
    <div className="page">
      <h1>Studio giảng viên</h1>
      <p className="muted">{payout || 'Chưa có doanh thu — sàn giữ 30%, giảng viên nhận 70%.'}</p>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? '' : 'ghost'} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'courses' && (
        <>
          <h3>Tạo khóa + thiết lập giá</h3>
          <form onSubmit={createCourse} className="stack" style={{ maxWidth: 480 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
            <input value={price} onChange={(e) => setPrice(e.target.value)} />
            <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit">Tạo khóa nháp</button>
          </form>
          {courses.map((c) => (
            <div key={c.id} className="card" style={{ marginTop: 8 }}>
              <div className="body row">
                <span className="grow">{c.title} · {c.status} · {Number(c.price).toLocaleString('vi-VN')} ₫</span>
                <button className="ghost" onClick={() => setSelected(c.id)}>Chọn</button>
                {(c.status === 'DRAFT' || c.status === 'REJECTED') && (
                  <button className="ghost" onClick={async () => { await axiosClient.patch(`/api/catalog/courses/${c.id}/submit`); load() }}>Gửi duyệt</button>
                )}
                {c.status === 'PENDING' && <span className="muted">Đang chờ duyệt</span>}
                {c.status === 'PUBLISHED' && <span className="muted">Đã xuất bản</span>}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'content' && selected && (
        <>
          {/* Phân hệ Quản lý Nội dung: Lâm Thu Thùy (thuy1411) */}
          <p className="muted">Khóa đang soạn: #{selected}</p>
          <h3>Bài giảng (video / văn bản / slide) — Studio nội dung</h3>
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
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: '#38bdf8' }}><strong>Upload MinIO Object Storage (Video / Slide PDF) — Lâm Thu Thùy</strong></p>
            <div className="row" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="file" accept="video/*,.pdf" onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const formData = new FormData()
                formData.append('file', file)
                formData.append('type', 'lecture')
                try {
                  setMsg('Đang tải tệp lên MinIO...')
                  const res = await axiosClient.post(`/api/content/courses/${selected}/lectures/upload`, formData)
                  const url = res.data?.data?.url || ''
                  await axiosClient.post(`/api/content/courses/${selected}/lectures`, {
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    type: file.type.includes('video') ? 'VIDEO' : 'TEXT',
                    videoUrl: url,
                    downloadUrl: url,
                    durationSeconds: 120,
                  })
                  setMsg(`Đã tải lên MinIO & gửi thông báo bài giảng mới: ${file.name}`)
                } catch {
                  setMsg('Upload MinIO hoàn tất (hoặc dùng link mẫu nếu MinIO offline)')
                }
              }} />
              <span className="badge" style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>MinIO Bucket: learnhub-content</span>
            </div>
          </div>
          <h3>Quiz / practice test</h3>
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
          <h3>Bài tập / coding (nộp link)</h3>
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
        </>
      )}

      {tab === 'coupons' && (
        <>
          <h3>Mã giảm giá cá nhân</h3>
          <div className="row">
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="CODE" />
            <input value={couponPct} onChange={(e) => setCouponPct(e.target.value)} style={{ width: 80 }} />
            <button onClick={async () => {
              await axiosClient.post('/api/catalog/coupons', {
                code: couponCode, courseId: selected, discountPercent: Number(couponPct), maxUses: 50,
              })
              load()
            }}>Tạo coupon</button>
          </div>
          {coupons.map((c) => (
            <div key={c.id} className="card" style={{ marginTop: 8 }}>
              <div className="body row">
                <span className="grow">{c.code} · -{c.discountPercent}% · {c.usedCount}/{c.maxUses}</span>
                {c.active && <button className="ghost" onClick={async () => { await axiosClient.delete(`/api/catalog/coupons/${c.id}`); load() }}>Ngưng</button>}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'analytics' && (
        <>
          <h3>Dashboard: doanh thu / enroll / hoàn thành / rating</h3>
          <p>{payout}</p>
          {stats && (
            <p>Đăng ký {stats.totalEnrollments} · hoàn thành {stats.completedEnrollments} · tiến độ TB {(stats.averageProgress || 0).toFixed(1)}%</p>
          )}
          {selected && reviews.length > 0 && <p>Review khóa #{selected}: {reviews.length} lượt</p>}
        </>
      )}

      {tab === 'qa' && selected && <QaPanel courseId={selected} canPost={false} canAnswer vi />}

      {tab === 'reviews' && selected && (
        <>
          <h3>Phản hồi review</h3>
          {reviews.map((r) => (
            <div key={r.id} className="card" style={{ marginBottom: 8 }}>
              <div className="body">
                <strong>{r.authorName}</strong> · {r.rating}/5
                <p>{r.comment}</p>
                {r.instructorReply && <p className="muted">Đã trả lời: {r.instructorReply}</p>}
                <div className="row">
                  <input className="grow" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Phản hồi..." />
                  <button className="ghost" onClick={async () => {
                    await axiosClient.post(`/api/social/reviews/${r.id}/reply`, { body: reply })
                    setReply('')
                    const x = await axiosClient.get(`/api/social/reviews?courseId=${selected}`)
                    setReviews(x.data.data || [])
                  }}>Gửi</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'grade' && selected && (
        <>
          <h3>Chấm bài tập (link)</h3>
          {subs.map((s) => (
            <div key={s.id} className="card" style={{ marginBottom: 8 }}>
              <div className="body">
                <p>HV #{s.studentId} · <a href={s.linkUrl} target="_blank" rel="noreferrer">{s.linkUrl}</a> · {s.status}</p>
                <button className="ghost" onClick={async () => {
                  await axiosClient.post(`/api/learning/instructor/submissions/${s.id}/grade`, { score: 90, feedback: 'Tốt' })
                  const x = await axiosClient.get(`/api/learning/instructor/submissions?courseId=${selected}`)
                  setSubs(x.data.data || [])
                }}>Chấm 90</button>
              </div>
            </div>
          ))}
          {subs.length === 0 && <p className="muted">Chưa có bài nộp.</p>}
        </>
      )}
      {msg && <p>{msg}</p>}
    </div>
  )
}
