import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

interface Alert {
  id: number
  kind: string
  sourceIp?: string | null
  username?: string | null
  message: string
  status: string
  createdAt: string
  canLockAccount: boolean
}

const KIND: Record<string, string> = {
  RATE_LIMIT: 'Vượt giới hạn request',
  LOGIN_FLOOD: 'Đăng nhập dồn dập',
  HUMAN_CHECK: 'Không xác nhận là người',
}

export default function AdminSecurityPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = () => {
    axiosClient.get('/api/users/admin/security/alerts')
      .then((res) => setAlerts(res.data.data || []))
      .catch(() => setAlerts([]))
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 20000)
    return () => window.clearInterval(timer)
  }, [])

  const block = async (alert: Alert) => {
    setBusyId(alert.id)
    try {
      const res = await axiosClient.post(`/api/users/admin/security/alerts/${alert.id}/block`)
      setMsg(res.data.message || (vi ? 'Đã chặn.' : 'Blocked.'))
      load()
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setMsg(ax.response?.data?.message || (vi ? 'Không chặn được.' : 'Could not block.'))
    } finally {
      setBusyId(null)
    }
  }

  const dismiss = async (alert: Alert) => {
    await axiosClient.post(`/api/users/admin/security/alerts/${alert.id}/dismiss`)
    load()
  }

  return (
    <div>
      <h2>{vi ? 'Bảo mật' : 'Security'}</h2>
      <p className="muted">
        {vi
          ? 'Mỗi máy được khoảng 200 request mỗi phút và 15 lần đăng nhập mỗi phút. Vượt mức là dấu hiệu DoS. Đăng nhập bắt buộc tích Tôi là người. Cảnh báo gửi tới email quản trị.'
          : 'Each machine gets about 200 requests and 15 logins per minute. Login requires the human checkbox. Alerts go to admin email.'}
      </p>
      {msg && <p>{msg}</p>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>{vi ? 'Thời điểm' : 'Time'}</th>
            <th>{vi ? 'Dấu hiệu' : 'Signal'}</th>
            <th>IP</th>
            <th>{vi ? 'Tài khoản' : 'Account'}</th>
            <th>{vi ? 'Nội dung' : 'Detail'}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {alerts.length === 0 && (
            <tr><td colSpan={6} className="muted">{vi ? 'Chưa có cảnh báo.' : 'No alerts.'}</td></tr>
          )}
          {alerts.map((alert) => (
            <tr key={alert.id}>
              <td>{new Date(alert.createdAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</td>
              <td>{KIND[alert.kind] || alert.kind}</td>
              <td>{alert.sourceIp || '—'}</td>
              <td>{alert.username || '—'}</td>
              <td>{alert.message}</td>
              <td>
                {alert.status === 'OPEN' ? (
                  <span className="row">
                    <button type="button" disabled={busyId === alert.id} onClick={() => block(alert)}>
                      {alert.canLockAccount ? (vi ? 'Chặn tài khoản' : 'Block account') : (vi ? 'Chặn máy' : 'Block machine')}
                    </button>
                    <button type="button" className="ghost" onClick={() => dismiss(alert)}>
                      {vi ? 'Bỏ qua' : 'Dismiss'}
                    </button>
                  </span>
                ) : (
                  <span className="muted">{alert.status === 'BLOCKED' ? (vi ? 'Đã chặn' : 'Blocked') : (vi ? 'Đã bỏ qua' : 'Dismissed')}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
