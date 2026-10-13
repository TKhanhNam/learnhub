import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SEED_REVIEWS, type Offer, levelLabel, loadOffers, money, shopName } from '../data/courseMarket'
import { placeOrder, quoteVoucher, originOf, hiddenSlugs, type PayMethod } from '../lib/buyerStore'
import { addReport, addReview, chatFor, extraReviews, replyOf, reportsFor, sendChat, sendOffer } from '../lib/marketStore'
import FavButton from '../components/FavButton'
import { useI18n } from '../context/I18nContext'

const REPORTS = ['Sai mô tả khóa', 'Vi phạm bản quyền', 'Spam', 'Lừa đảo']

interface ApiReview {
  id: number
  authorName: string
  rating: number
  comment: string
  instructorReply?: string
}

export default function ListingPage() {
  const { id = '' } = useParams()
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [offer, setOffer] = useState<Offer | null | undefined>(undefined)
  const [apiReviews, setApiReviews] = useState<ApiReview[]>([])
  const [tick, setTick] = useState(0)
  const [author, setAuthor] = useState('')
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [reason, setReason] = useState(REPORTS[0])
  const [reported, setReported] = useState(false)
  const [draft, setDraft] = useState('')
  const [bid, setBid] = useState('')
  const [pay, setPay] = useState<PayMethod>('momo')
  const [voucher, setVoucher] = useState('')
  const [bought, setBought] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadOffers().then((rows) => {
      if (!cancelled) setOffer(rows.find((item) => item.slug === id) || null)
    })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!offer) return
    let cancelled = false
    fetch(`/api/social/reviews?courseId=${offer.id}`)
      .then((res) => res.json())
      .then((body) => { if (!cancelled) setApiReviews(Array.isArray(body?.data) ? body.data : []) })
      .catch(() => { if (!cancelled) setApiReviews([]) })
    return () => { cancelled = true }
  }, [offer])

  if (offer === undefined) return <div className="page"><p className="muted">{vi ? 'Đang tải tin khóa học...' : 'Loading listing...'}</p></div>
  if (!offer) {
    return (
      <div className="page">
        <p>{vi ? 'Không tìm thấy khóa.' : 'Course not found.'}</p>
        <Link to="/market">{vi ? 'Về chợ khóa học' : 'Back to market'}</Link>
      </div>
    )
  }

  const shop = shopName(offer)
  const reviews = [
    ...SEED_REVIEWS.filter((row) => row.slug === offer.slug),
    ...extraReviews(offer.slug),
  ]
  void tick

  const submitReview = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    addReview(offer.slug, author, rating, text, shop)
    setText('')
    setTick((n) => n + 1)
  }

  const submitReport = (e: FormEvent) => {
    e.preventDefault()
    addReport(offer.slug, reason)
    setReported(true)
  }

  const submitChat = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    sendChat(offer.slug, draft, shop, offer.title)
    setDraft('')
    setTick((n) => n + 1)
  }

  return (
    <div className="page listing-page">
      <Link to="/market" className="muted">{vi ? '← Chợ khóa học' : '← Course market'}</Link>
      <div className="listing-layout">
        <div>
          <div className="listing-hero" style={{ background: `linear-gradient(145deg, hsl(${offer.hue} 70% 48%), hsl(${offer.hue} 35% 18%))` }}>
            {offer.ad && <span className="ad-badge">{vi ? 'Quảng cáo' : 'Ad'}</span>}
          </div>
          <h1>{offer.title}</h1>
          <FavButton slug={offer.slug} />
          <p className="price">{money(offer.price)}</p>
          {hiddenSlugs().includes(offer.slug) && <p className="err">{vi ? 'Admin đã ẩn tin này khỏi chợ.' : 'An admin hid this listing.'}</p>}
          <p><span className="cond-badge">{vi ? 'Nguồn nội dung' : 'Content source'}: {
            originOf(offer.slug) === 'original' ? (vi ? 'Giảng viên tự soạn' : 'Written by the instructor')
              : originOf(offer.slug) === 'cited' ? (vi ? 'Có trích nguồn tài liệu' : 'Sources are cited')
                : originOf(offer.slug) === 'copied' ? (vi ? 'Nghi sao chép' : 'Possible copy')
                  : (vi ? 'Chưa kiểm tra' : 'Not checked')
          }</span></p>
          <p><span className="cond-badge">{vi ? 'Trình độ' : 'Level'}: {levelLabel(offer.level, vi)}</span></p>
          <p>{offer.description || offer.subtitle}</p>
          <p className="muted">{offer.category} · {offer.city}</p>
          <p><Link to={`/courses/${offer.slug}`}>{vi ? 'Mở trang khóa học' : 'Open the course page'} →</Link></p>

          <section className="learner-panel">
            <h2>{vi ? 'Đánh giá' : 'Reviews'}</h2>
            {apiReviews.map((row) => (
              <article key={`api-${row.id}`} className="review-card">
                <strong>{row.authorName}</strong>
                <span>{'★'.repeat(Math.min(5, row.rating))}</span>
                <p>{row.comment}</p>
                {row.instructorReply && <p className="review-reply"><strong>{shop}:</strong> {row.instructorReply}</p>}
              </article>
            ))}
            {reviews.map((row) => (
              <article key={row.id} className="review-card">
                <strong>{row.author}</strong>
                <span>{'★'.repeat(row.rating)}{'☆'.repeat(5 - row.rating)}</span>
                <p>{row.text}</p>
                <p className="review-reply"><strong>{shop}:</strong> {replyOf(row.id, row.reply)}</p>
              </article>
            ))}
            {!apiReviews.length && !reviews.length && <p className="muted">{vi ? 'Chưa có đánh giá.' : 'No reviews yet.'}</p>}
            <form onSubmit={submitReview}>
              <h3>{vi ? 'Viết đánh giá' : 'Write a review'}</h3>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={vi ? 'Tên của bạn' : 'Your name'} />
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={vi ? 'Nhận xét về khóa học' : 'Comment on the course'} required />
              <button type="submit">{vi ? 'Gửi đánh giá' : 'Send review'}</button>
            </form>
          </section>
        </div>
        <aside className="listing-side">
          <div className="learner-panel">
            <h2>{shop}</h2>
            <p className="muted">{offer.instructorName} · {offer.city}</p>
            <Link to={`/shops/${offer.instructorId}`}>{vi ? 'Xem gian hàng' : 'View shop'} →</Link>
          </div>
          <form className="learner-panel" onSubmit={(e) => {
            e.preventDefault()
            const quote = quoteVoucher(voucher, offer.price)
            const order = placeOrder({
              slug: offer.slug,
              title: offer.title,
              instructorId: offer.instructorId,
              shop,
              price: offer.price,
              method: pay,
              code: voucher,
            })
            setBought(`${order.id} · ${quote.message || (vi ? 'Không dùng voucher' : 'No voucher')} · ${order.total.toLocaleString('vi-VN')} đ · ${vi ? 'tiền đang được giữ' : 'funds held'}`)
          }}>
            <h2>{vi ? 'Đặt mua' : 'Buy'}</h2>
            <p className="muted">{vi ? 'Không có phí ship. Tiền được giữ đến khi bạn xác nhận đã vào học được.' : 'No shipping fee. Payment is held until you confirm you can start the course.'}</p>
            <select value={pay} onChange={(e) => setPay(e.target.value as PayMethod)}>
              <option value="momo">MoMo</option>
              <option value="on-access">{vi ? 'Trả sau khi vào học (thay cho COD)' : 'Pay when the course opens'}</option>
            </select>
            <input value={voucher} onChange={(e) => setVoucher(e.target.value)} placeholder={vi ? 'Voucher sàn LEARNHUB20 hoặc voucher shop' : 'Platform or shop voucher'} />
            <button type="submit">{vi ? 'Đặt và giữ tiền' : 'Place order'}</button>
            {bought && <p className="learner-ok">{bought} · <Link to="/orders">{vi ? 'Xem đơn' : 'View orders'}</Link></p>}
          </form>
          <form className="learner-panel" onSubmit={submitReport}>
            <h2>{vi ? 'Báo cáo tin' : 'Report listing'}</h2>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORTS.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button type="submit" className="ghost">{vi ? 'Gửi báo cáo' : 'Send report'}</button>
            {reported && <p className="learner-ok">{vi ? `Đã ghi nhận. Tin này có ${reportsFor(offer.slug).length} báo cáo trên máy này.` : 'Report saved on this device.'}</p>}
          </form>
          <form className="learner-panel" onSubmit={submitChat}>
            <h2>{vi ? 'Chat với shop' : 'Chat with the shop'}</h2>
            <div className="chat-log">
              {chatFor(offer.slug).map((line) => (
                <p key={line.id} className={line.from === 'me' ? 'chat-me' : 'chat-shop'}>{line.text}</p>
              ))}
              {!chatFor(offer.slug).length && <p className="muted">{vi ? 'Hỏi shop về học phí, lịch học hoặc chứng chỉ.' : 'Ask about price, schedule, or the certificate.'}</p>}
            </div>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={vi ? 'Nhập tin nhắn' : 'Type a message'} />
            <button type="submit">{vi ? 'Gửi' : 'Send'}</button>
            <div className="row">
              <input value={bid} onChange={(e) => setBid(e.target.value)} placeholder={vi ? 'Giá muốn trả' : 'Your offer'} />
              <button type="button" className="ghost" onClick={() => {
                const amount = Number(bid)
                if (!amount) return
                sendOffer(offer.slug, amount, shop, offer.price)
                setBid('')
                setTick((n) => n + 1)
              }}>{vi ? 'Trả giá' : 'Make an offer'}</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  )
}
