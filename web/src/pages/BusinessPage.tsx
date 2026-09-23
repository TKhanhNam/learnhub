import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'

interface Plan { code: string; name: string; seats: number; priceLabel: string }
interface Course { id: number; title: string; categoryName: string; slug: string }

const FEATURES = [
  { name: 'Thư viện khóa tuyển chọn', team: true, biz: true, ent: true },
  { name: 'Quản trị user / nhóm', team: true, biz: true, ent: true },
  { name: 'Lộ trình học (learning paths)', team: false, biz: true, ent: true },
  { name: 'Báo cáo L&D', team: false, biz: true, ent: true },
  { name: 'Nội dung tùy chỉnh + SSO', team: false, biz: false, ent: true },
]

export default function BusinessPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [library, setLibrary] = useState<Course[]>([])
  const [company, setCompany] = useState('Công ty Demo')
  const [email, setEmail] = useState('hr@company.vn')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    axiosClient.get('/api/org/plans').then((res) => setPlans(res.data.data || [])).catch(() => {})
    axiosClient.get('/api/catalog/courses?size=12').then((res) => setLibrary(res.data.data || [])).catch(() => {})
  }, [])

  const demo = async (e: FormEvent) => {
    e.preventDefault()
    const res = await axiosClient.post('/api/org/demo-requests', { company, contactEmail: email, message: 'Muốn dùng thử LearnHub Business' })
    setMsg(res.data.message)
  }

  const mark = (ok: boolean) => ok ? '✓' : '—'

  return (
    <div className="page">
      <h1>LearnHub cho doanh nghiệp</h1>
      <p className="muted">So sánh gói (Compare Plans), thư viện tuyển chọn, đăng ký demo.</p>
      <h2>Compare Plans</h2>
      <div className="compare">
        <table>
          <thead>
            <tr>
              <th>Tính năng</th>
              {plans.map((p) => <th key={p.code}>{p.name}<div className="muted">{p.seats} chỗ · {p.priceLabel}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.name}>
                <td>{f.name}</td>
                <td>{mark(f.team)}</td>
                <td>{mark(f.biz)}</td>
                <td>{mark(f.ent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Thư viện tuyển chọn</h2>
      <div className="grid">
        {library.slice(0, 6).map((c) => (
          <Link key={c.id} to={`/courses/${c.slug}`} className="card">
            <div className="body">
              <strong>{c.title}</strong>
              <p className="muted">{c.categoryName}</p>
            </div>
          </Link>
        ))}
      </div>
      <h3>Đăng ký dùng thử / demo</h3>
      <form onSubmit={demo} className="stack" style={{ maxWidth: 420 }}>
        <input value={company} onChange={(e) => setCompany(e.target.value)} required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit">Gửi yêu cầu demo</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  )
}
