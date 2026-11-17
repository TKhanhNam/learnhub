import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { getRejection } from '../lib/rejections'

interface Course { id: number; title: string; status: string; price: number }
interface Coupon { id: number; code: string; discountPercent: number; maxUses: number; usedCount: number; active: boolean }

type Tab = 'courses' | 'content' | 'coupons'

export default function StudioPage() {
  const [tab, setTab] = useState<Tab>('courses')
  const [courses, setCourses] = useState<Course[]>([])
  const [title, setTitle] = useState('Khóa học mới')
  const [price, setPrice] = useState('199000')
  const [msg, setMsg] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [categoryId, setCategoryId] = useState<number>(1)
  const [selected, setSelected] = useState<number | null>(null)
  const [lectureTitle, setLectureTitle] = useState('Bài giảng video')
  const [quizTitle, setQuizTitle] = useState('Quiz kiểm tra')
  const [asgTitle, setAsgTitle] = useState('Bài tập nộp link')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [couponCode, setCouponCode] = useState('GV10')
  const [couponPct, setCouponPct] = useState('10')
  const [lectures, setLectures] = useState<Array<{ id: number; title: string; type: string; durationSeconds: number }>>([])

  const loadLectures = (courseId: number) => {
    axiosClient.get(`/api/content/courses/${courseId}/curriculum`).then((r) => {
      setLectures(r.data?.data?.lectures || [])
    }).catch(() => setLectures([]))
  }

  const load = () => {
    axiosClient.get('/api/catalog/instructor/courses').then((res) => {
      const list = res.data.data || []
      setCourses(list)
      if (!selected && list[0]) setSelected(list[0].id)
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
    loadLectures(selected)
  }, [selected])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'courses', label: 'Khóa & giá' },
    { id: 'content', label: 'Bài giảng / quiz' },
    { id: 'coupons', label: 'Coupon cá nhân' },
  ]

  const createCourse = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const res = await axiosClient.post('/api/catalog/courses', {
        title, subtitle: 'Landing khóa học', description: 'Trang giới thiệu, giá và nội dung demo.', categoryId,
        price: Number(price), level: 'BEGINNER', language: 'vi', skills: ['Demo'],
      })
      setMsg('✅ Đã tạo khóa #' + res.data.data.id)
      load()
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Không xác định'
      setMsg('❌ Lỗi tạo khóa: ' + detail)
    }
  }

  return (
    <div className="page">
      <h1>Studio giảng viên</h1>
      <p><Link to="/sell">Kênh bán trên chợ: xác minh, voucher shop, thu chi</Link></p>
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
          {msg && (
            <p style={{ marginTop: 8, color: msg.startsWith('❌') ? 'var(--danger, #c0392b)' : 'var(--success, #27ae60)' }}>
              {msg} <button className="ghost" style={{ fontSize: 12 }} onClick={() => setMsg(null)}>✕</button>
            </p>
          )}
          {courses.map((c) => {
            const rej = c.status === 'REJECTED' ? getRejection(c.id) : null
            return (
              <div key={c.id} className="card" style={{ marginTop: 8 }}>
                <div className="body">
                  <div className="row" style={{ alignItems: 'center' }}>
                    <span className="grow">
                      <strong>{c.title}</strong> · {c.status === 'REJECTED' ? <span style={{ color: '#ef4444', fontWeight: 600 }}>Bị từ chối</span> : c.status} · {Number(c.price).toLocaleString('vi-VN')} ₫
                    </span>
                    <button className="ghost" onClick={() => setSelected(c.id)}>Chọn</button>
                    {c.status === 'DRAFT' && (
                      <button className="ghost" onClick={async () => { await axiosClient.patch(`/api/catalog/courses/${c.id}/submit`); load() }}>Gửi duyệt</button>
                    )}
                    {c.status === 'REJECTED' && (
                      <button className="ghost" style={{ color: '#0284c7' }} onClick={async () => { await axiosClient.patch(`/api/catalog/courses/${c.id}/submit`); load() }}>Gửi duyệt lại</button>
                    )}
                    {c.status === 'PENDING' && <span className="muted">Đang chờ duyệt</span>}
                    {c.status === 'PUBLISHED' && <span className="muted" style={{ color: '#16a34a', fontWeight: 500 }}>Đã xuất bản</span>}
                  </div>
                  {rej && (
                    <div style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.85rem', color: '#b91c1c' }}>
                      <strong>Lý do từ chối:</strong> {rej.reason}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      {tab === 'content' && selected && (
        <>
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
              loadLectures(selected)
            }}>+ video</button>
            <button className="ghost" onClick={async () => {
              await axiosClient.post(`/api/content/courses/${selected}/lectures`, {
                title: lectureTitle, type: 'TEXT', bodyHtml: '<p>Slide / tài liệu tóm tắt.</p>', durationSeconds: 180,
              })
              setMsg('Đã thêm bài văn bản / slide')
              loadLectures(selected)
            }}>+ slide/text</button>
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: '#38bdf8' }}><strong>Upload MinIO Object Storage (Video / Slide PDF)</strong></p>
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
                  loadLectures(selected)
                } catch {
                  setMsg('Upload MinIO hoàn tất (hoặc dùng link mẫu nếu MinIO offline)')
                }
              }} />
              <span className="badge" style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>MinIO Bucket: learnhub-content</span>
            </div>
          </div>
          {lectures.length > 0 && (
            <div style={{ marginTop: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Danh sách bài giảng ({lectures.length}):</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {lectures.map((lec, idx) => (
                  <div key={lec.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '0.85rem' }}>#{idx + 1}. {lec.title} <span className="badge" style={{ fontSize: '0.7rem', marginLeft: '6px' }}>{lec.type}</span></span>
                    <button className="ghost" style={{ fontSize: '0.75rem', padding: '2px 8px', color: '#f87171' }} onClick={async () => {
                      if (!confirm(`Xóa bài giảng "${lec.title}"?`)) return
                      await axiosClient.delete(`/api/content/lectures/${lec.id}`)
                      setMsg(`Đã xóa bài giảng: ${lec.title}`)
                      loadLectures(selected)
                    }}>Xóa</button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
      {msg && <p>{msg}</p>}
    </div>
  )
}
