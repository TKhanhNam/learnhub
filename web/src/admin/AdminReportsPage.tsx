import { useState } from 'react'
import { useI18n } from '../context/I18nContext'
import { downloadExcel } from './adminUtils'

export default function AdminReportsPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (url: string, filename: string, key: string) => {
    setBusy(key)
    setMsg(null)
    try {
      await downloadExcel(url, filename)
      setMsg(vi ? `Đã tải ${filename}` : `Downloaded ${filename}`)
    } catch {
      setMsg(vi ? 'Không xuất được file. Hãy chạy lại backend rồi thử lại.' : 'Export failed. Restart the backend and retry.')
    } finally {
      setBusy(null)
    }
  }

  const reports = [
    { key: 'users', title: vi ? 'Tài khoản' : 'Accounts', desc: vi ? 'Danh sách user, vai trò, trạng thái khóa, lý do.' : 'Users, roles, lock status and reasons.', url: '/api/users/admin/export', file: 'learnhub-tai-khoan.xlsx' },
    { key: 'courses', title: vi ? 'Khóa học' : 'Courses', desc: vi ? 'Toàn bộ khóa, giá, trạng thái, số học viên.' : 'All courses, prices, status, enrollments.', url: '/api/catalog/admin/export', file: 'learnhub-khoa-hoc.xlsx' },
    { key: 'revenue', title: vi ? 'Doanh thu' : 'Revenue', desc: vi ? 'Tổng quan, đơn hàng, khóa bán chạy.' : 'Overview, orders, top courses.', url: '/api/commerce/admin/export', file: 'learnhub-doanh-thu.xlsx' },
  ]

  return (
    <div>
      <h2>{vi ? 'Xuất báo cáo Excel' : 'Excel reports'}</h2>
      <p className="muted">{vi ? 'Tải file .xlsx để nộp báo cáo hoặc đối soát.' : 'Download .xlsx files for reporting.'}</p>
      <div className="admin-kpis">
        {reports.map((r) => (
          <article key={r.key} className="admin-kpi">
            <strong>{r.title}</strong>
            <small>{r.desc}</small>
            <button disabled={busy === r.key} onClick={() => run(r.url, r.file, r.key)} style={{ marginTop: 12 }}>
              {busy === r.key ? '...' : (vi ? 'Tải Excel' : 'Download Excel')}
            </button>
          </article>
        ))}
      </div>
      {msg && <p>{msg}</p>}
    </div>
  )
}
