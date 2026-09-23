import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'

interface Org { id: number; name: string; plan: string; seatLimit: number; memberCount: number }
interface Member { id: number; userId: number; role: string }
interface Path { id: number; title: string; courseIds: number[] }
interface Report { members: number; paths: number; plan: string }
interface Course { id: number; title: string }

export default function OrgPage() {
  const [org, setOrg] = useState<Org | null>(null)
  const [name, setName] = useState('FPT Demo')
  const [plan, setPlan] = useState('TEAM')
  const [userId, setUserId] = useState('4')
  const [role, setRole] = useState('LEARNER')
  const [courseId, setCourseId] = useState('1')
  const [pathTitle, setPathTitle] = useState('Lộ trình onboarding')
  const [pathCourses, setPathCourses] = useState('1,2')
  const [members, setMembers] = useState<Member[]>([])
  const [paths, setPaths] = useState<Path[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [library, setLibrary] = useState<Course[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await axiosClient.get('/api/org/organizations/me')
      const o = res.data.data as Org
      setOrg(o)
      const [m, p, r] = await Promise.all([
        axiosClient.get(`/api/org/organizations/${o.id}/members`),
        axiosClient.get(`/api/org/organizations/${o.id}/paths`),
        axiosClient.get(`/api/org/organizations/${o.id}/report`),
      ])
      setMembers(m.data.data || [])
      setPaths(p.data.data || [])
      setReport(r.data.data)
    } catch {
      setOrg(null)
    }
  }

  useEffect(() => {
    load()
    axiosClient.get('/api/catalog/courses?size=20').then((res) => setLibrary(res.data.data || [])).catch(() => {})
  }, [])

  return (
    <div className="page">
      <h1>Quản trị L&D</h1>
      {!org && (
        <div className="stack" style={{ maxWidth: 420 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="TEAM">Nhóm nhỏ</option>
            <option value="BUSINESS">Doanh nghiệp</option>
            <option value="ENTERPRISE">Tập đoàn</option>
          </select>
          <button onClick={async () => {
            await axiosClient.post('/api/org/organizations', { name, plan })
            load()
          }}>Tạo tổ chức</button>
        </div>
      )}
      {org && (
        <>
          <p>{org.name} · gói {org.plan} · {org.memberCount}/{org.seatLimit} chỗ</p>
          {report && <p className="muted">Báo cáo L&D: {report.members} nhân sự · {report.paths} lộ trình · gói {report.plan}</p>}

          <h3>Nhóm / người dùng</h3>
          <div className="row">
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId" />
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="LEARNER">LEARNER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button onClick={async () => {
              await axiosClient.post(`/api/org/organizations/${org.id}/members`, { userId: Number(userId), role })
              setMsg('Đã thêm nhân sự')
              load()
            }}>Thêm</button>
          </div>
          {members.map((m) => (
            <p key={m.id} className="muted">User #{m.userId} · nhóm {m.role}</p>
          ))}

          <h3>Lộ trình học</h3>
          <div className="row">
            <input className="grow" value={pathTitle} onChange={(e) => setPathTitle(e.target.value)} />
            <input value={pathCourses} onChange={(e) => setPathCourses(e.target.value)} placeholder="1,2,3" />
            <button onClick={async () => {
              const ids = pathCourses.split(',').map((x) => Number(x.trim())).filter(Boolean)
              await axiosClient.post(`/api/org/organizations/${org.id}/paths`, { title: pathTitle, courseIds: ids })
              setMsg('Đã tạo lộ trình')
              load()
            }}>Tạo path</button>
          </div>
          {paths.map((p) => (
            <p key={p.id}>{p.title} · khóa {p.courseIds?.join(', ')}</p>
          ))}

          <h3>Thư viện & cấp khóa</h3>
          <div className="row">
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {library.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button onClick={async () => {
              await axiosClient.post(`/api/org/organizations/${org.id}/assign`, {
                userId: Number(userId), courseId: Number(courseId),
              })
              setMsg('Đã cấp quyền học trọn đời cho nhân sự')
            }}>Cấp khóa</button>
          </div>
        </>
      )}
      {msg && <p>{msg}</p>}
    </div>
  )
}
