import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'

interface Course { id: number; title: string; status: string }
interface User { id: number; username: string; role: string; locked: boolean }

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const load = () => {
    axiosClient.get('/api/catalog/admin/courses?status=PENDING').then((res) => setCourses(res.data.data || [])).catch(() => {})
    axiosClient.get('/api/users?size=20').then((res) => setUsers(res.data.data || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page">
      <h1>Admin</h1>
      <h3>Khóa chờ duyệt</h3>
      {courses.map((c) => (
        <div key={c.id} className="card" style={{ marginBottom: 8 }}>
          <div className="body row">
            <span className="grow">{c.title}</span>
            <button onClick={async () => {
              await axiosClient.patch(`/api/catalog/admin/courses/${c.id}/moderate`, { action: 'APPROVE' })
              setMsg('Đã duyệt')
              load()
            }}>Duyệt</button>
            <button className="ghost" onClick={async () => {
              await axiosClient.patch(`/api/catalog/admin/courses/${c.id}/moderate`, { action: 'REJECT' })
              load()
            }}>Từ chối</button>
          </div>
        </div>
      ))}
      <h3>Người dùng</h3>
      {users.map((u) => (
        <p key={u.id}>{u.username} · {u.role} · {u.locked ? 'khóa' : 'mở'}</p>
      ))}
      {msg && <p>{msg}</p>}
    </div>
  )
}
