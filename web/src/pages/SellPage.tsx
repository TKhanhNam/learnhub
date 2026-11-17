import { FormEvent, useEffect, useState } from 'react'
import { addVoucher, kycOf, ledger, saveKycFor, seller, vouchers } from '../lib/buyerStore'
import { buyersOf, openChat } from '../lib/inbox'
import { useAuth } from '../context/AuthContext'
import axiosClient from '../api/axiosClient'

const VIETNAM_BANKS = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'MB Bank',
  'Techcombank',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'SHB',
  'VIB',
  'MSB',
  'OCB',
  'SeABank',
  'Eximbank',
  'LPBank',
  'Nam A Bank',
  'Bac A Bank',
  'PVcomBank',
  'VietABank',
  'Vietbank',
  'KienlongBank',
  'ABBank',
  'NCB',
  'BaoViet Bank',
  'PGBank',
  'Saigonbank',
  'BVBank',
  'DongA Bank',
  'GPBank',
  'OceanBank',
  'CB Bank',
  'Public Bank Việt Nam',
  'Shinhan Bank',
  'HSBC Việt Nam',
  'Standard Chartered',
  'Woori Bank',
  'UOB',
  'CIMB',
  'Hong Leong Bank',
  'Indovina Bank',
]

export default function SellPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(() => (user?.id ? kycOf(user.id) : kycOf(0)))
  const [code, setCode] = useState('SHOP15')
  const [percent, setPercent] = useState('15')
  const [max, setMax] = useState('20')
  const [tick, setTick] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [kycEdit, setKycEdit] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    axiosClient.get('/api/users/me/kyc')
      .then((res) => {
        if (cancelled) return
        const data = res.data?.data
        if (data && data.kyc && data.kyc !== 'none') {
          const next = {
            fullName: data.fullName || '',
            idNumber: data.idNumber || '',
            kyc: data.kyc as 'pending' | 'verified',
            bank: data.bank || '',
            accountNumber: data.accountNumber || '',
            accountName: data.accountName || '',
          }
          saveKycFor(user.id, user.username, next)
          setProfile(next)
          return
        }
        const mine = kycOf(user.id)
        if (mine.kyc !== 'none') {
          setProfile(mine)
          axiosClient.put('/api/users/me/kyc', mine).catch(() => {})
          return
        }
        const leftover = seller()
        if (leftover.kyc !== 'none') {
          saveKycFor(user.id, user.username, leftover)
          setProfile(leftover)
          axiosClient.put('/api/users/me/kyc', leftover).catch(() => {})
        }
      })
      .catch(() => {
        if (cancelled) return
        const mine = kycOf(user.id)
        if (mine.kyc !== 'none') setProfile(mine)
      })
    return () => { cancelled = true }
  }, [user?.id, user?.username])

  const saveKyc = (e: FormEvent) => {
    e.preventDefault()
    if (profile.kyc === 'verified') return
    if (!user?.id) return
    const saved = kycOf(user.id)
    const unchanged = saved.kyc !== 'none'
      && saved.fullName === profile.fullName
      && saved.idNumber === profile.idNumber
      && saved.bank === profile.bank
      && saved.accountNumber === profile.accountNumber
      && saved.accountName === profile.accountName
    if (unchanged) {
      setKycEdit(false)
      setMsg('Hồ sơ không đổi. Vẫn đang chờ quản trị duyệt.')
      return
    }
    const next = { ...profile, kyc: 'pending' as const }
    axiosClient.put('/api/users/me/kyc', next)
      .then(() => {
        saveKycFor(user.id, user.username, next)
        setProfile(next)
        setKycEdit(false)
        setMsg('Đã gửi hồ sơ. Quản trị duyệt ở mục Vận hành thì tiền mới về tài khoản ngân hàng.')
      })
      .catch(() => setMsg('Không gửi được hồ sơ. Hãy chạy identity-service rồi gửi lại.'))
  }

  const books = ledger()
  void tick

  const exportCsv = () => {
    const lines = ['don,khoa,tong,phi_san,thuc_nhan', ...books.released.map((row) => {
      const fee = Math.round(row.total * 0.3)
      return `${row.id},${row.title},${row.total},${fee},${row.total - fee}`
    })]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'thu-chi-shop.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <header className="learner-hero">
        <p>Kênh người bán</p>
        <h1>Shop khóa học</h1>
      </header>
      <section className="learner-panel">
        <h2>Người đã mua</h2>
        {user && buyersOf(user.id).length > 0 && (
          <ul className="buyer-list">
            {buyersOf(user.id).map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{row.learnerName || 'Học viên'}</strong>
                  <span>{row.courseTitle || 'Khóa học'}</span>
                </div>
                <button type="button" className="ghost" onClick={() => openChat(row.id)}>Nhắn</button>
              </li>
            ))}
          </ul>
        )}
        {user && !buyersOf(user.id).length && <p className="muted">Chưa có người mua nhắn tin.</p>}
        {!user && <p className="muted">Đăng nhập bằng tài khoản giảng viên để xem danh sách.</p>}
      </section>

      <form className="learner-panel" onSubmit={saveKyc}>
        <h2>Xác minh danh tính và tài khoản nhận tiền</h2>
        <p className="muted">
          {profile.kyc === 'verified'
            ? 'Đã duyệt'
            : profile.kyc === 'pending'
              ? 'Đang chờ duyệt'
              : 'Chưa gửi'}
        </p>
        <input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} placeholder="Họ tên trên CCCD" required readOnly={profile.kyc !== 'none' && !kycEdit} />
        <input value={profile.idNumber} onChange={(e) => setProfile({ ...profile, idNumber: e.target.value })} placeholder="Số CCCD" required readOnly={profile.kyc !== 'none' && !kycEdit} />
        <select
          value={profile.bank}
          onChange={(e) => setProfile({ ...profile, bank: e.target.value })}
          required
          disabled={profile.kyc !== 'none' && !kycEdit}
        >
          <option value="">Chọn ngân hàng</option>
          {!VIETNAM_BANKS.includes(profile.bank) && profile.bank && <option value={profile.bank}>{profile.bank}</option>}
          {VIETNAM_BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
        </select>
        <input value={profile.accountNumber} onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })} placeholder="Số tài khoản" required readOnly={profile.kyc !== 'none' && !kycEdit} />
        <input value={profile.accountName} onChange={(e) => setProfile({ ...profile, accountName: e.target.value })} placeholder="Tên chủ tài khoản" required readOnly={profile.kyc !== 'none' && !kycEdit} />
        <div className="row">
          {profile.kyc === 'none' && <button type="submit">Gửi hồ sơ</button>}
          {profile.kyc === 'pending' && !kycEdit && (
            <button type="button" className="ghost" onClick={() => setKycEdit(true)}>Sửa hồ sơ</button>
          )}
          {profile.kyc === 'pending' && kycEdit && (
            <>
              <button type="submit">Gửi lại</button>
              <button type="button" className="ghost" onClick={() => { setProfile(user?.id ? kycOf(user.id) : profile); setKycEdit(false) }}>Hủy</button>
            </>
          )}
        </div>
      </form>

      <form className="learner-panel" onSubmit={(e) => {
        e.preventDefault()
        addVoucher(code, Number(percent) || 0, Number(max) || 1)
        setTick((n) => n + 1)
        setMsg('Đã tạo voucher shop.')
      }}>
        <h2>Voucher của shop</h2>
        <div className="row">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Mã" />
          <input value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="%" />
          <input value={max} onChange={(e) => setMax(e.target.value)} placeholder="Số lượng" />
          <button type="submit">Tạo</button>
        </div>
        {vouchers().map((item) => (
          <p key={item.id}>{item.code} · {item.percent}% · {item.used}/{item.max} lượt</p>
        ))}
      </form>

      <section className="learner-panel">
        <h2>Thu chi</h2>
        <div className="fee-chart">
          {[
            { label: 'Tổng đơn', amount: books.gross, height: books.gross ? 100 : 8 },
            { label: 'Phí sàn 30%', amount: books.fee, height: books.gross ? Math.round(books.fee / books.gross * 100) : 8 },
            { label: 'Tiền về shop', amount: books.net, height: books.gross ? Math.round(books.net / books.gross * 100) : 8 },
          ].map((item) => (
            <div key={item.label} className="fee-col">
              <div className="fee-bar" aria-hidden="true"><i style={{ height: `${Math.max(item.height, 8)}%` }} /></div>
              <strong>{item.amount.toLocaleString('vi-VN')} đ</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <button type="button" className="ghost" onClick={exportCsv}>Xuất CSV</button>
      </section>
      {msg && <p className="learner-ok">{msg}</p>}
    </div>
  )
}
