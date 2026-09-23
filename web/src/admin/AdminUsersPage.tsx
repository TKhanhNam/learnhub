import { FormEvent, useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

interface User {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  locked: boolean
  lockReason?: string | null
  createdAt?: string
}

interface MailLog {
  id: number
  recipient: string
  subject: string
  body: string
  status: string
  errorMessage?: string | null
  createdAt: string
}

export default function AdminUsersPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [users, setUsers] = useState<User[]>([])
  const [mails, setMails] = useState<MailLog[]>([])
  const [keyword, setKeyword] = useState('')
  const [lockUser, setLockUser] = useState<User | null>(null)
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const load = () => {
    const q = keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}&size=50` : '?size=50'
    axiosClient.get(`/api/users${q}`).then((r) => setUsers(r.data.data || [])).catch(() => setUsers([]))
    axiosClient.get('/api/users/admin/mail-log?size=10').then((r) => setMails(r.data.data || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const search = (e: FormEvent) => { e.preventDefault(); load() }

  const lock = async () => {
    if (!lockUser) return
    if (reason.trim().length < 10) {
      setMsg(vi ? 'Lý do khóa phải từ 10 ký tự để gửi email.' : 'Lock reason must be at least 10 characters.')
      return
    }
    await axiosClient.patch(`/api/users/${lockUser.id}/lock`, { locked: true, reason: reason.trim() })
    setMsg(vi
      ? `Đã khóa ${lockUser.username}. Lý do đã gửi tới ${lockUser.email}.`
      : `Locked ${lockUser.username}. Reason emailed to ${lockUser.email}.`)
    setLockUser(null)
    setReason('')
    load()
  }

  return (
    <div>
      <h2>{vi ? 'Quản lý tài khoản' : 'Account management'}</h2>
      <p className="muted">{vi ? 'Khóa tài khoản bắt buộc nhập lý do. Hệ thống gửi email tới địa chỉ đăng ký.' : 'Locking an account requires a reason, emailed to the registered address.'}</p>
      <form className="row" onSubmit={search} style={{ marginBottom: 16 }}>
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={vi ? 'Tìm tên hoặc username' : 'Search name or username'} style={{ maxWidth: 280 }} />
        <button type="submit">{vi ? 'Tìm' : 'Search'}</button>
      </form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{vi ? 'Tài khoản' : 'Account'}</th>
            <th>Email</th>
            <th>{vi ? 'Vai trò' : 'Role'}</th>
            <th>{vi ? 'Trạng thái' : 'Status'}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td><strong>{u.fullName}</strong><div className="muted">{u.username}</div></td>
              <td>{u.email}</td>
              <td>
                <select defaultValue={u.role} onChange={async (e) => {
                  await axiosClient.patch(`/api/users/${u.id}/role`, { role: e.target.value })
                  load()
                }}>
                  {['STUDENT', 'INSTRUCTOR', 'ORG_ADMIN', 'ADMIN'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td>
                {u.locked
                  ? <span className="tag tag-rejected">{vi ? 'Đã khóa' : 'Locked'}</span>
                  : <span className="tag tag-published">{vi ? 'Hoạt động' : 'Active'}</span>}
                {u.locked && u.lockReason && <div className="muted">{u.lockReason}</div>}
              </td>
              <td>
                {u.locked ? (
                  <button className="ghost" onClick={async () => {
                    await axiosClient.patch(`/api/users/${u.id}/lock`, { locked: false, reason: '' })
                    setMsg(vi ? `Đã mở khóa ${u.username}` : `Unlocked ${u.username}`)
                    load()
                  }}>{vi ? 'Mở khóa' : 'Unlock'}</button>
                ) : (
                  <button onClick={() => { setLockUser(u); setReason(''); setMsg(null) }}>{vi ? 'Khóa' : 'Lock'}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {lockUser && (
        <div className="admin-modal">
          <div className="card">
            <div className="body">
              <h3>{vi ? `Khóa ${lockUser.fullName}` : `Lock ${lockUser.fullName}`}</h3>
              <p className="muted">{vi ? `Email nhận lý do: ${lockUser.email}` : `Reason will be emailed to ${lockUser.email}`}</p>
              <label>{vi ? 'Lý do khóa (bắt buộc, gửi email)' : 'Lock reason (required, emailed)'}</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder={vi ? 'Ví dụ: Vi phạm điều khoản cộng đồng, spam đánh giá...' : 'Example: Community guideline violation...'} />
              {msg && <p className="err">{msg}</p>}
              <div className="row" style={{ marginTop: 12 }}>
                <button onClick={lock}>{vi ? 'Khóa và gửi email' : 'Lock and email'}</button>
                <button className="ghost" onClick={() => setLockUser(null)}>{vi ? 'Hủy' : 'Cancel'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 28 }}>{vi ? 'Email đã gửi' : 'Sent email log'}</h3>
      {mails.length === 0 && <p className="muted">{vi ? 'Chưa có email khóa tài khoản.' : 'No lock emails yet.'}</p>}
      {mails.map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: 8 }}>
          <div className="body">
            <strong>{m.subject}</strong>
            <div className="muted">{m.recipient} · {m.status} · {new Date(m.createdAt).toLocaleString('vi-VN')}</div>
            {m.errorMessage && <p className="err">{m.errorMessage}</p>}
          </div>
        </div>
      ))}
      {msg && !lockUser && <p>{msg}</p>}
    </div>
  )
}
