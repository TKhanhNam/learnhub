import { FormEvent, useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'
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

function statusLabel(status: string, vi: boolean) {
  const found = STATUS_FILTERS.find((s) => s.value === status)
  if (found) return vi ? found.vi : found.en
  return status
}

export default function AdminCoursesPage() {
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

  const moderate = async (id: number, action: string) => {
    await axiosClient.patch(`/api/catalog/admin/courses/${id}/moderate`, { action })
    setMsg(vi ? 'Đã cập nhật trạng thái' : 'Status updated')
    load()
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
              await axiosClient.post('/api/catalog/courses', {
                title: title || (vi ? 'Khóa học mới' : 'New course'),
                subtitle: vi ? 'Tạo bởi quản trị viên' : 'Created by admin',
                description: vi ? 'Nội dung đang cập nhật' : 'Content pending',
                categoryId, price: Number(price), level: 'BEGINNER', language: 'vi', skills: ['Admin'],
              })
              setTitle('')
              setMsg(vi ? 'Đã tạo khóa nháp' : 'Draft created')
              load()
            }}>{vi ? 'Tạo' : 'Create'}</button>
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
          {courses.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>
                {editId === c.id ? (
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                ) : c.title}
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
                {c.status !== 'PUBLISHED' && <button className="ghost" onClick={() => moderate(c.id, 'APPROVE')}>{vi ? 'Duyệt' : 'Approve'}</button>}
                {c.status === 'PENDING' && <button className="ghost" onClick={() => moderate(c.id, 'REJECT')}>{vi ? 'Từ chối' : 'Reject'}</button>}
                {c.status === 'PUBLISHED' && <button className="ghost" onClick={() => moderate(c.id, 'UNPUBLISH')}>{vi ? 'Ẩn' : 'Unpublish'}</button>}
                <button className="ghost" onClick={async () => {
                  if (!confirm(vi ? 'Xóa khóa học này?' : 'Delete this course?')) return
                  try {
                    await axiosClient.delete(`/api/catalog/courses/${c.id}`)
                    load()
                  } catch (err: unknown) {
                    const ax = err as { response?: { data?: { message?: string } } }
                    setMsg(ax.response?.data?.message || (vi ? 'Không xóa được' : 'Cannot delete'))
                  }
                }}>{vi ? 'Xóa' : 'Delete'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <p className="muted">{msg}</p>}
    </div>
  )
}
