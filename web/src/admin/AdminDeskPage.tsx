import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import {
  addCategory, addPlatformVoucher, adLimit, adsTaken, approveKyc, categoryNames,
  kycQueue, ledger, orders, platformVouchers, setAdLimit, setOrderStatus,
} from '../lib/buyerStore'
import { useI18n } from '../context/I18nContext'

interface Alert { id: number; kind: string; sourceIp: string; username: string; message: string; status: string }
interface LockedUser { id: number; username: string; fullName: string; email: string; lockReason?: string | null; lockedAt?: string | null }
interface KycRow {
  userId: number
  username: string
  fullName: string
  idNumber: string
  bank: string
  accountNumber: string
  accountName: string
  kyc: string
}

export default function AdminDeskPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [tick, setTick] = useState(0)
  const [code, setCode] = useState('CARE10')
  const [slots, setSlots] = useState(String(adLimit()))
  const [cat, setCat] = useState('')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertsFailed, setAlertsFailed] = useState(false)
  const [locked, setLocked] = useState<LockedUser[]>([])
  const [unlocking, setUnlocking] = useState<number | null>(null)
  const [secMsg, setSecMsg] = useState<string | null>(null)
  const [pending, setPending] = useState<KycRow[]>([])
  const books = ledger()
  void tick

  useEffect(() => {
    axiosClient.get('/api/users/admin/security/alerts')
      .then((res) => { setAlerts(res.data.data || []); setAlertsFailed(false) })
      .catch(() => { setAlerts([]); setAlertsFailed(true) })
    axiosClient.get('/api/users?size=200')
      .then((res) => setLocked((res.data.data || []).filter((u: LockedUser & { locked: boolean }) => u.locked)))
      .catch(() => setLocked([]))
    axiosClient.get('/api/users/admin/kyc')
      .then((res) => {
        const fromApi: KycRow[] = res.data.data || []
        const fromLocal = kycQueue().filter((row) => row.kyc === 'pending')
        const combined = [...fromApi]
        for (const loc of fromLocal) {
          if (!combined.some((c) => c.userId === loc.userId)) {
            combined.push(loc)
          }
        }
        setPending(combined)
      })
      .catch(() => setPending(kycQueue().filter((row) => row.kyc === 'pending')))
  }, [tick])

  const unlock = async (target: LockedUser) => {
    if (!window.confirm(vi
      ? `Mở khóa ${target.fullName} (${target.username})? Hệ thống sẽ gửi email báo tới ${target.email}.`
      : `Unlock ${target.fullName} (${target.username})? An email goes to ${target.email}.`)) return
    setUnlocking(target.id)
    try {
      await axiosClient.patch(`/api/users/${target.id}/lock`, { locked: false, reason: '' })
      setSecMsg(vi ? `Đã mở khóa ${target.username} và gửi email báo.` : `Unlocked ${target.username} and emailed them.`)
      refresh()
    } catch {
      setSecMsg(vi ? `Không mở khóa được ${target.username}.` : `Could not unlock ${target.username}.`)
    } finally {
      setUnlocking(null)
    }
  }

  const refresh = () => setTick((n) => n + 1)

  const exportCsv = () => {
    const lines = ['nguon,so_tien', `nguoi_mua,${books.gross}`, `phi_san,${books.fee}`, `tra_shop,${books.net}`]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dong-tien-san.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="stack">
      <h1>{vi ? 'Vận hành sàn' : 'Marketplace desk'}</h1>

      <section className="card"><div className="body">
        <h2>{vi ? 'Đơn và khiếu nại' : 'Orders and complaints'}</h2>
        {!orders().length && <p className="muted">{vi ? 'Chưa có đơn trên chợ.' : 'No market orders.'}</p>}
        {orders().map((order) => (
          <p key={order.id}>
            {order.title} · {order.total.toLocaleString('vi-VN')} đ · {order.status}
            {order.status === 'complaint' && <button type="button" className="ghost" onClick={() => { setOrderStatus(order.id, 'refunded'); refresh() }}>{vi ? 'Hoàn MoMo' : 'Refund'}</button>}
          </p>
        ))}
      </div></section>

      <section className="card"><div className="body">
        <h2>{vi ? 'Duyệt tài khoản nhận tiền' : 'Payout KYC'}</h2>
        {!pending.length && <p className="muted">{vi ? 'Chưa có hồ sơ chờ duyệt.' : 'No pending payout profiles.'}</p>}
        <ul className="unlock-list">
          {pending.map((row) => (
            <li key={`${row.userId}-${row.accountNumber}`}>
              <div className="unlock-who">
                <span className="unlock-avatar" aria-hidden="true">{(row.fullName || '?').trim().charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{row.fullName}</strong>
                  <span>{row.username ? `@${row.username}` : (vi ? 'Giảng viên' : 'Instructor')} · {row.bank} {row.accountNumber}</span>
                  <p>{vi ? 'Chủ TK: ' : 'Account: '}{row.accountName}</p>
                  <small>{vi ? 'CCCD ' : 'ID '}{row.idNumber}</small>
                </div>
              </div>
              <button type="button" onClick={async () => {
                try {
                  await axiosClient.patch(`/api/users/${row.userId}/kyc`)
                } catch {
                  // ignore
                }
                approveKyc(row.userId)
                setSecMsg(vi ? `Đã duyệt hồ sơ của ${row.fullName}.` : `Approved KYC for ${row.fullName}.`)
                refresh()
              }}>{vi ? 'Duyệt' : 'Approve'}</button>
            </li>
          ))}
        </ul>
      </div></section>

      <section className="card"><div className="body">
        <h2>{vi ? 'Danh mục' : 'Categories'}</h2>
        <p>{categoryNames().join(' · ')}</p>
        <form className="row" onSubmit={(e) => { e.preventDefault(); addCategory(cat); setCat(''); refresh() }}>
          <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder={vi ? 'Tên danh mục' : 'Category'} />
          <button type="submit">{vi ? 'Thêm' : 'Add'}</button>
        </form>
      </div></section>

      <section className="card"><div className="body">
        <h2>{vi ? 'Voucher sàn và suất quảng cáo' : 'Platform vouchers and ad slots'}</h2>
        <form className="row" onSubmit={(e) => { e.preventDefault(); addPlatformVoucher(code, 10, 50); refresh() }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="submit">{vi ? 'Phát hành voucher' : 'Issue voucher'}</button>
        </form>
        {platformVouchers().map((item) => <p key={item.id}>{item.code} · {item.percent}% · {item.used}/{item.max}</p>)}
        <form className="row" onSubmit={(e) => { e.preventDefault(); setAdLimit(Number(slots) || 1); refresh() }}>
          <input value={slots} onChange={(e) => setSlots(e.target.value)} />
          <button type="submit">{vi ? 'Đặt số suất quảng cáo' : 'Set ad slots'}</button>
        </form>
        <p className="muted">{vi ? `Đã dùng ${adsTaken()}/${adLimit()} suất.` : `${adsTaken()}/${adLimit()} slots used.`}</p>
      </div></section>

      <section className="card"><div className="body">
        <h2>{vi ? 'Dòng tiền' : 'Cash flow'}</h2>
        <p>{vi ? 'Người mua trả' : 'Paid by learners'} {books.gross.toLocaleString('vi-VN')} đ · {vi ? 'phí sàn' : 'platform fee'} {books.fee.toLocaleString('vi-VN')} đ · {vi ? 'trả shop' : 'to shops'} {books.net.toLocaleString('vi-VN')} đ</p>
        <div className="fee-chart">
          {[
            { label: vi ? 'Thu' : 'In', amount: books.gross, height: 100 },
            { label: vi ? 'Phí' : 'Fee', amount: books.fee, height: books.gross ? Math.round(books.fee / books.gross * 100) : 8 },
            { label: 'Shop', amount: books.net, height: books.gross ? Math.round(books.net / books.gross * 100) : 8 },
          ].map((item) => (
            <div key={item.label} className="fee-col">
              <div className="fee-bar" aria-hidden="true"><i style={{ height: `${Math.max(item.height, 8)}%` }} /></div>
              <strong>{item.amount.toLocaleString('vi-VN')} đ</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <button type="button" className="ghost" onClick={exportCsv}>CSV</button>
        <p><Link to="/admin/revenue">{vi ? 'Doanh thu đơn MoMo trên hệ thống' : 'MoMo revenue'}</Link></p>
      </div></section>

      <section className="card"><div className="body">
        <h2>{vi ? 'Chặn tấn công' : 'Abuse controls'}</h2>
        <p className="muted">{vi ? 'Cổng vào cảnh báo khi một máy gửi quá nhiều request. Sai mật khẩu 5 lần trong 10 phút thì khóa IP 15 phút. Có thể khóa tài khoản hoặc bỏ qua cảnh báo.' : 'The gateway warns when one machine sends too many requests. Five bad passwords in 10 minutes lock the IP for 15 minutes.'}</p>
        {alertsFailed && <p className="muted">{vi ? 'Chưa tải được cảnh báo. Bật identity-service để xem danh sách thật.' : 'Alerts need identity-service.'}</p>}
        {!alertsFailed && !alerts.length && <p className="muted">{vi ? 'Chưa có cảnh báo tấn công.' : 'No attack alerts.'}</p>}
        {alerts.map((alert) => (
          <p key={alert.id}>{alert.kind} · {alert.sourceIp} · {alert.username} · {alert.status}<br />{alert.message}
            {alert.status === 'OPEN' && <>
              <button type="button" className="ghost" onClick={async () => {
                const res = await axiosClient.post(`/api/users/admin/security/alerts/${alert.id}/block`)
                setSecMsg(res.data.message)
                refresh()
              }}>{vi ? 'Khóa tài khoản hoặc IP' : 'Lock account or IP'}</button>
              <button type="button" className="ghost" onClick={async () => {
                await axiosClient.post(`/api/users/admin/security/alerts/${alert.id}/dismiss`)
                refresh()
              }}>{vi ? 'Bỏ qua' : 'Dismiss'}</button>
            </>}
          </p>
        ))}
        <h3 className="unlock-title">{vi ? `Tài khoản đang bị khóa (${locked.length})` : `Locked accounts (${locked.length})`}</h3>
        {!locked.length && <p className="muted">{vi ? 'Không có tài khoản nào đang bị khóa.' : 'No accounts are locked.'}</p>}
        <ul className="unlock-list">
          {locked.map((u) => (
            <li key={u.id}>
              <div className="unlock-who">
                <span className="unlock-avatar" aria-hidden="true">{(u.fullName || u.username).trim().charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{u.fullName}</strong>
                  <span>@{u.username} · {u.email}</span>
                  <p>{vi ? 'Lý do: ' : 'Reason: '}{u.lockReason || (vi ? 'Không ghi lý do' : 'No reason given')}</p>
                  {u.lockedAt && <small>{vi ? 'Khóa lúc ' : 'Locked at '}{new Date(u.lockedAt).toLocaleString('vi-VN')}</small>}
                </div>
              </div>
              <button type="button" disabled={unlocking === u.id} onClick={() => unlock(u)}>
                {unlocking === u.id ? '...' : (vi ? 'Mở khóa' : 'Unlock')}
              </button>
            </li>
          ))}
        </ul>
        {secMsg && <p className="learner-ok">{secMsg}</p>}
        <p className="muted"><Link to="/admin/users">{vi ? 'Xem toàn bộ tài khoản' : 'All accounts'}</Link></p>
      </div></section>
    </div>
  )
}
