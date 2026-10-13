import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { type Offer, loadOffers, money, shopName } from '../data/courseMarket'
import { useI18n } from '../context/I18nContext'

export default function ShopPage() {
  const { id = '' } = useParams()
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [rows, setRows] = useState<Offer[] | null>(null)

  useEffect(() => {
    let cancelled = false
    loadOffers().then((offers) => {
      if (!cancelled) setRows(offers.filter((item) => String(item.instructorId) === id))
    })
    return () => { cancelled = true }
  }, [id])

  if (rows === null) return <div className="page"><p className="muted">{vi ? 'Đang tải gian hàng...' : 'Loading shop...'}</p></div>
  if (!rows.length) {
    return (
      <div className="page">
        <p>{vi ? 'Không tìm thấy gian hàng.' : 'Shop not found.'}</p>
        <Link to="/market">{vi ? 'Về chợ khóa học' : 'Back to market'}</Link>
      </div>
    )
  }

  const shop = shopName(rows[0])
  return (
    <div className="page">
      <header className="learner-hero">
        <p>{vi ? 'Gian hàng giảng viên' : 'Instructor shop'}</p>
        <h1>{shop}</h1>
        <p className="muted">{rows[0].instructorName} · {rows[0].city}</p>
      </header>
      <p>{vi
        ? `${shop} đang mở ${rows.length} khóa trên LearnHub. Học viên học trên web và nhận chứng chỉ khi hoàn thành.`
        : `${shop} has ${rows.length} courses on LearnHub.`}</p>
      <div className="market-grid">
        {rows.map((item) => (
          <Link key={item.slug} to={`/market/${item.slug}`} className="market-card">
            <div className="market-photo" style={{ background: `linear-gradient(145deg, hsl(${item.hue} 70% 46%), hsl(${item.hue} 40% 22%))` }}>
              {item.ad && <span className="ad-badge">{vi ? 'Quảng cáo' : 'Ad'}</span>}
            </div>
            <div className="market-card-body">
              <strong>{item.title}</strong>
              <div className="price">{money(item.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
