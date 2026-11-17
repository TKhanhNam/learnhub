import { FormEvent, useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { adminThreadId, ensureThread, sendMail } from '../lib/inbox'
import { getRejection, removeRejection, saveRejection } from '../lib/rejections'
import { money } from './adminUtils'

interface Course {
  id: number
  title: string
  status: string
  price: number
  categoryName?: string
  enrollmentCount?: number
  instructorId: number
}

interface Category { id: number; name: string }

const STATUS_FILTERS = [
  { value: 'ALL', vi: 'Tất cả', en: 'All' },
  { value: 'PENDING', vi: 'Chờ duyệt', en: 'Pending' },
  { value: 'PUBLISHED', vi: 'Đã xuất bản', en: 'Published' },
  { value: 'DRAFT', vi: 'Nháp', en: 'Draft' },
  { value: 'REJECTED', vi: 'Từ chối', en: 'Rejected' },
] as const

const REJECTION_SUGGESTIONS = [
  'Chưa có bài giảng video hoặc tài liệu khóa học',
  'Nội dung và thời lượng khóa học chưa đạt chuẩn chất lượng',
  'Tiêu đề hoặc mô tả khóa học chưa đầy đủ, rõ ràng',
  'Mức học phí chưa tương xứng với nội dung bài học',
  'Cần bổ sung thêm bài tập hoặc quiz thực hành',
]

function statusLabel(status: string, vi: boolean) {
  const found = STATUS_FILTERS.find((s) => s.value === status)
  if (found) return vi ? found.vi : found.en
  return status
}

export default function AdminCoursesPage() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [status, setStatus] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('199000')
  const [categoryId, setCategoryId] = useState<number>(1)
  const [msg, setMsg] = useState<string | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPrice, setEditPrice] = useState('')

  // Modal từ chối
  const [rejectingCourse, setRejectingCourse] = useState<Course | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = () => {
    const q = new URLSearchParams({ status, size: '50' })
    if (keyword.trim()) q.set('keyword', keyword.trim())
    axiosClient.get(`/api/catalog/admin/courses?${q}`).then((r) => setCourses(r.data.data || [])).catch(() => setCourses([]))
  }

  useEffect(() => {
    axiosClient.get('/api/catalog/categories').then((r) => {
      setCategories(r.data.data || [])
      if (r.data.data?.[0]) setCategoryId(r.data.data[0].id)
    })
  }, [])

  useEffect(() => { load() }, [status])

  const search = (e: FormEvent) => { e.preventDefault(); load() }

  const submitForReview = async (id: number) => {
    try {
      await axiosClient.patch(`/api/catalog/courses/${id}/submit`)
      removeRejection(id)
      setMsg(vi ? 'Đã chuyển khóa học sang Chờ duyệt' : 'Moved to pending')
      if (status === 'PENDING') {
        load()
      } else {
        setStatus('PENDING')
      }
    } catch (err: any) {
      setMsg(err?.response?.data?.message || err?.message || (vi ? 'Lỗi chuyển chờ duyệt' : 'Failed to submit'))
    }
  }

  const moderate = async (id: number, action: string, targetStatus?: string) => {
    try {
      await axiosClient.patch(`/api/catalog/admin/courses/${id}/moderate`, { action })
      let text = 'Đã cập nhật trạng thái'
      if (action === 'APPROVE') {
        removeRejection(id)
        text = vi ? 'Đã duyệt khóa học (chuyển sang Đã xuất bản)' : 'Course approved (Published)'
      } else if (action === 'UNPUBLISH') {
        text = vi ? 'Đã ẩn khóa học (chuyển về nháp)' : 'Moved to draft'
      }
      setMsg(text)
      if (targetStatus) {
        if (status === targetStatus) {
          load()
        } else {
          setStatus(targetStatus)
        }
      } else {
        load()
      }
    } catch (err: any) {
      setMsg(err?.response?.data?.message || err?.message || (vi ? 'Lỗi thao tác' : 'Action failed'))
    }
  }

  const handleOpenReject = (c: Course) => {
    setRejectingCourse(c)
    setRejectReason('')
  }

  const handleConfirmReject = async (e: FormEvent) => {
    e.preventDefault()
    if (!rejectingCourse) return
    const reasonText = rejectReason.trim() || 'Nội dung khóa học chưa đạt yêu cầu kiểm duyệt.'
    const c = rejectingCourse

    try {
      // 1. Cập nhật trạng thái sang REJECTED trên backend
      await axiosClient.patch(`/api/catalog/admin/courses/${c.id}/moderate`, { action: 'REJECT', note: reasonText })

      // 2. Lưu lý do từ chối để giảng viên xem trong Studio
      saveRejection(c.id, c.title, reasonText, user?.fullName || 'Ban quản trị')

      // 3. Gửi tin nhắn lý do đến người gửi duyệt (giảng viên)
      const threadId = adminThreadId(c.instructorId)
      ensureThread({
        id: threadId,
        kind: 'admin',
        title: 'Ban quản trị LearnHub',
        peerId: c.instructorId,
        peerName: 'Giảng viên',
        courseTitle: c.title,
      })
      sendMail(
        threadId,
        user?.id || 1,
        user?.fullName || 'Ban quản trị LearnHub',
        `[THÔNG BÁO TỪ CHỐI DUYỆT KHÓA HỌC]\nKhóa học: "${c.title}" (Mã #${c.id})\nLý do từ chối: ${reasonText}\n\nVui lòng xem xét, chỉnh sửa lại nội dung trong Studio giảng viên và gửi duyệt lại.`
      )

      setMsg(vi ? `Đã từ chối khóa học "${c.title}" và gửi lý do đến người gửi duyệt.` : `Rejected and sent reason to instructor.`)
      setRejectingCourse(null)
      setRejectReason('')

      if (status === 'REJECTED') {
        load()
      } else {
        setStatus('REJECTED')
      }
    } catch (err: any) {
      setMsg(err?.response?.data?.message || err?.message || (vi ? 'Không thể từ chối khóa học' : 'Failed to reject'))
    }
  }

  const handleDeleteForever = async (c: Course) => {
    if (!confirm(vi ? `Xóa vĩnh viễn khóa học #${c.id} "${c.title}" khỏi hệ thống?` : `Permanently delete course #${c.id}?`)) return
    try {
      await axiosClient.delete(`/api/catalog/courses/${c.id}`)
      removeRejection(c.id)
      setMsg(vi ? 'Đã xóa vĩnh viễn khóa học' : 'Course deleted')
      load()
    } catch (err: any) {
      setMsg(err?.response?.data?.message || (vi ? 'Không xóa được' : 'Cannot delete'))
    }
  }

  return (
    <div>
      <h2>{vi ? 'Quản lý khóa học' : 'Course management'}</h2>
      <form className="row" onSubmit={search} style={{ marginBottom: 16 }}>
        {STATUS_FILTERS.map((s) => (
          <button type="button" key={s.value} className={status === s.value ? '' : 'ghost'} onClick={() => setStatus(s.value)}>
            {vi ? s.vi : s.en}
          </button>
        ))}
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={vi ? 'Tìm theo tên' : 'Search by title'} style={{ maxWidth: 240 }} />
        <button type="submit">{vi ? 'Lọc' : 'Filter'}</button>
      </form>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="body">
          <h3>{vi ? 'Tạo khóa học' : 'Create course'}</h3>
          <div className="row">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={vi ? 'Tên khóa học' : 'Course title'} />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={vi ? 'Giá' : 'Price'} style={{ maxWidth: 160 }} />
            <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} style={{ maxWidth: 220 }}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={async () => {
              try {
                const res = await axiosClient.post('/api/catalog/courses', {
                  title: title || (vi ? 'Khóa học mới' : 'New course'),
                  subtitle: vi ? 'Tạo bởi quản trị viên' : 'Created by admin',
                  description: vi ? 'Nội dung đang cập nhật' : 'Content pending',
                  categoryId, price: Number(price), level: 'BEGINNER', language: 'vi', skills: ['Admin'],
                })
                const newId = res.data?.data?.id
                if (newId) {
                  await axiosClient.patch(`/api/catalog/courses/${newId}/submit`).catch(() => {})
                }
                setTitle('')
                setMsg(vi ? 'Đã tạo khóa học (chuyển sang Chờ duyệt)' : 'Course created (Moved to pending)')
                if (status === 'PENDING') {
                  load()
                } else {
                  setStatus('PENDING')
                }
              } catch (err: any) {
                setMsg(err?.response?.data?.message || err?.message || (vi ? 'Lỗi tạo khóa' : 'Failed to create course'))
              }
            }}>{vi ? 'Tạo (Chờ duyệt)' : 'Create (Pending)'}</button>
          </div>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{vi ? 'Tên' : 'Title'}</th>
            <th>{vi ? 'Giá' : 'Price'}</th>
            <th>{vi ? 'Trạng thái' : 'Status'}</th>
            <th>{vi ? 'Học viên' : 'Learners'}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => {
            const rej = c.status === 'REJECTED' ? getRejection(c.id) : null
            return (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  {editId === c.id ? (
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  ) : (
                    <div>
                      <div>{c.title}</div>
                      {rej && (
                        <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: 2 }}>
                          ⚠️ Lý do từ chối: {rej.reason}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  {editId === c.id ? (
                    <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{ maxWidth: 120 }} />
                  ) : money(c.price)}
                </td>
                <td><span className={`tag tag-${c.status.toLowerCase()}`}>{statusLabel(c.status, vi)}</span></td>
                <td>{c.enrollmentCount ?? 0}</td>
                <td className="row">
                  {editId === c.id ? (
                    <button onClick={async () => {
                      await axiosClient.put(`/api/catalog/courses/${c.id}`, {
                        title: editTitle, subtitle: c.title, description: c.title,
                        categoryId: categoryId, price: Number(editPrice), level: 'BEGINNER', language: 'vi',
                      })
                      setEditId(null)
                      load()
                    }}>{vi ? 'Lưu' : 'Save'}</button>
                  ) : (
                    <button className="ghost" onClick={() => { setEditId(c.id); setEditTitle(c.title); setEditPrice(String(c.price)) }}>{vi ? 'Sửa' : 'Edit'}</button>
                  )}

                  {/* Khóa Nháp: nút Chờ duyệt */}
                  {c.status === 'DRAFT' && (
                    <button className="ghost" onClick={() => submitForReview(c.id)}>
                      {vi ? 'Chờ duyệt' : 'Submit'}
                    </button>
                  )}

                  {/* Khóa Chờ duyệt: nút Duyệt */}
                  {c.status === 'PENDING' && (
                    <button className="ghost" onClick={() => moderate(c.id, 'APPROVE', 'PUBLISHED')}>
                      {vi ? 'Duyệt' : 'Approve'}
                    </button>
                  )}

                  {/* Khóa Từ chối: có thể gửi Chờ duyệt lại hoặc Duyệt */}
                  {c.status === 'REJECTED' && (
                    <>
                      <button className="ghost" onClick={() => submitForReview(c.id)}>
                        {vi ? 'Chờ duyệt lại' : 'Resubmit'}
                      </button>
                      <button className="ghost" onClick={() => moderate(c.id, 'APPROVE', 'PUBLISHED')}>
                        {vi ? 'Duyệt' : 'Approve'}
                      </button>
                    </>
                  )}

                  {/* Khóa Đã xuất bản: nút Ẩn */}
                  {c.status === 'PUBLISHED' && (
                    <button className="ghost" onClick={() => moderate(c.id, 'UNPUBLISH', 'DRAFT')}>
                      {vi ? 'Ẩn' : 'Unpublish'}
                    </button>
                  )}

                  {/* Nút Từ chối: hiển thị cho tất cả khóa chưa bị từ chối */}
                  {c.status !== 'REJECTED' && (
                    <button className="ghost" style={{ color: '#ef4444' }} onClick={() => handleOpenReject(c)}>
                      {vi ? 'Từ chối' : 'Reject'}
                    </button>
                  )}

                  {/* Nút Xóa vĩnh viễn: chỉ hiển thị cho khóa đã bị từ chối */}
                  {c.status === 'REJECTED' && (
                    <button className="ghost" style={{ color: '#991b1b' }} onClick={() => handleDeleteForever(c)}>
                      {vi ? 'Xóa vĩnh viễn' : 'Delete'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {msg && <p className="muted" style={{ marginTop: 12 }}>{msg}</p>}

      {/* Modal nhập lý do từ chối khóa học */}
      {rejectingCourse && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }}>
          <div style={{
            background: 'var(--bg-card, #ffffff)', color: 'var(--text, #1e293b)',
            padding: 24, borderRadius: 12, maxWidth: 540, width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ marginTop: 0, color: '#dc2626' }}>
              {vi ? 'Từ chối phê duyệt khóa học' : 'Reject Course'}
            </h3>
            <p style={{ margin: '8px 0 16px', fontSize: '0.95rem' }}>
              Khóa: <strong>#{rejectingCourse.id} - {rejectingCourse.title}</strong>
            </p>

            <form onSubmit={handleConfirmReject}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>
                {vi ? 'Lý do từ chối (gửi trực tiếp đến người tạo khóa):' : 'Rejection reason:'}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={vi ? 'Nhập chi tiết lý do từ chối để giảng viên chỉnh sửa...' : 'Enter rejection reason...'}
                rows={4}
                required
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: 12 }}
              />

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 6px' }}>
                  {vi ? 'Gợi ý lý do nhanh:' : 'Quick suggestions:'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {REJECTION_SUGGESTIONS.map((sug, i) => (
                    <button
                      type="button"
                      key={i}
                      className="ghost"
                      style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #e2e8f0' }}
                      onClick={() => setRejectReason(sug)}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="ghost" onClick={() => setRejectingCourse(null)}>
                  {vi ? 'Hủy bỏ' : 'Cancel'}
                </button>
                <button type="submit" style={{ background: '#dc2626', color: '#fff', border: 'none' }}>
                  {vi ? 'Gửi lý do & Từ chối' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
