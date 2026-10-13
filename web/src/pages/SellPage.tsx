import { FormEvent, useEffect, useMemo, useState } from 'react'
import { SEED_REVIEWS, type Offer, loadOffers, money } from '../data/courseMarket'
import { addVoucher, adLimit, adsTaken, kycOf, ledger, registerAd, saveKycFor, saveListing, seller, vouchers } from '../lib/buyerStore'
import { buyersOf, openChat } from '../lib/inbox'
import { allReviews, replyOf, setReply } from '../lib/marketStore'
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
  const [offers, setOffers] = useState<Offer[]>([])
  const [profile, setProfile] = useState(() => (user?.id ? kycOf(user.id) : kycOf(0)))
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('SHOP15')
  const [percent, setPercent] = useState('15')
  const [max, setMax] = useState('20')
  const [replyId, setReplyId] = useState('')
  const [reply, setReplyText] = useState('')
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

  useEffect(() => {
    loadOffers().then((rows) => {
      setOffers(rows)
      const first = rows[0]
      if (first) {
        setSlug(first.slug)
        setTitle(first.title)
        setPrice(String(first.price))
        setDescription(first.description)
      }
    })
  }, [])

  const current = offers.find((item) => item.slug === slug)
  const suggestion = useMemo(() => {
    if (!current) return 0
    const peers = offers.filter((item) => item.category === current.category)
    if (!peers.length) return current.price
    return Math.round(peers.reduce((sum, item) => sum + item.price, 0) / peers.length)
  }, [offers, current])

  const pick = (next: string) => {
    const row = offers.find((item) => item.slug === next)
    setSlug(next)
    if (!row) return
    setTitle(row.title)
    setPrice(String(row.price))
    setDescription(row.description)
  }

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

  const saveTin = (e: FormEvent) => {
    e.preventDefault()
    if (!slug) return
    saveListing(slug, { title, price: Number(price) || 0, description })
    setMsg('Đã sửa tin. Giá gợi ý lấy trung bình các khóa cùng danh mục.')
    loadOffers().then(setOffers)
  }

  const books = ledger()
  const taken = adsTaken()
  const slots = adLimit()
  void tick
  const reviewRows = [
    ...SEED_REVIEWS.map((row) => ({ ...row, reply: replyOf(row.id, row.reply) })),
    ...allReviews().map((row) => ({ ...row, reply: replyOf(row.id, row.reply) })),
  ]

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

      <form className="learner-panel" onSubmit={saveTin}>
        <h2>Đăng tin, sửa tin, gợi ý giá</h2>
        <p className="muted">Tạo khóa mới vẫn ở Studio. Ở đây sửa tin đang bán trên chợ.</p>
        <select value={slug} onChange={(e) => pick(e.target.value)}>
          {offers.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên khóa" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Giá" />
        <p className="muted">Gợi ý giá cùng danh mục: {money(suggestion)}</p>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <button type="submit">Lưu tin</button>
      </form>

      <section className="learner-panel">
        <h2>Gói quảng cáo</h2>
        <p>Đã đăng ký {taken}/{slots} suất. Gói làm khóa hiện ở mục Quảng cáo trên trang chủ.</p>
        <button
          type="button"
          disabled={taken >= slots || profile.kyc !== 'verified'}
          onClick={() => {
            if (registerAd()) setMsg('Đã đăng ký một suất quảng cáo.')
            setTick((n) => n + 1)
          }}
        >
          {taken >= slots ? 'Hết suất' : 'Đăng ký gói'}
        </button>
        {profile.kyc !== 'verified' && <p className="muted">Cần xác minh danh tính trước khi đăng ký gói.</p>}
      </section>

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

      <form className="learner-panel" onSubmit={(e) => {
        e.preventDefault()
        if (!replyId) return
        setReply(replyId, reply)
        setTick((n) => n + 1)
        setMsg('Đã trả lời đánh giá.')
      }}>
        <h2>Trả lời đánh giá</h2>
        <select value={replyId} onChange={(e) => {
          setReplyId(e.target.value)
          const row = reviewRows.find((item) => item.id === e.target.value)
          setReplyText(row?.reply || '')
        }}>
          <option value="">Chọn đánh giá</option>
          {reviewRows.map((item) => <option key={item.id} value={item.id}>{item.author}: {item.text}</option>)}
        </select>
        <textarea value={reply} onChange={(e) => setReplyText(e.target.value)} rows={3} placeholder="Câu trả lời của shop" />
        <button type="submit">Gửi trả lời</button>
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
