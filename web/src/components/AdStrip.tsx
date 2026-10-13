import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CITIES, type Offer, loadOffers, money, saveRegion, savedRegion, shopName } from '../data/courseMarket'
import { hiddenSlugs } from '../lib/buyerStore'
import { useI18n } from '../context/I18nContext'

export default function AdStrip() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [region, setRegion] = useState(savedRegion)
  const [offers, setOffers] = useState<Offer[]>([])

  useEffect(() => {
    let cancelled = false
    loadOffers().then((rows) => {
      if (!cancelled) setOffers(rows)
    })
    return () => { cancelled = true }
  }, [])

  const pickRegion = (city: string) => {
    setRegion(city)
    saveRegion(city)
  }

  const categories = [...new Set(offers.map((item) => item.category))].slice(0, 8)
  const ads = offers.filter((item) => item.ad && !hiddenSlugs().includes(item.slug) && (!region || item.city === region)).slice(0, 4)

  return (
    <section className="market-home">
      <div className="market-home-head">
        <h2>{vi ? 'Quảng cáo' : 'Ads'}</h2>
        <label>
          {vi ? 'Khu vực' : 'Area'}
          <select value={region} onChange={(e) => pickRegion(e.target.value)}>
            <option value="">{vi ? 'Tất cả' : 'All'}</option>
            {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </label>
        <Link to={region ? `/market?city=${encodeURIComponent(region)}` : '/market'}>
          {vi ? 'Vào chợ khóa học' : 'Open course market'} →
        </Link>
      </div>
      <div className="market-cats">
        {categories.map((category) => (
          <Link key={category} to={`/market?category=${encodeURIComponent(category)}`}>{category}</Link>
        ))}
      </div>
      <div className="market-row">
        {ads.map((item) => (
          <Link key={item.slug} to={`/market/${item.slug}`} className="market-card">
            <div className="market-photo" style={{ background: `linear-gradient(145deg, hsl(${item.hue} 70% 46%), hsl(${item.hue} 40% 22%))` }}>
              <span className="ad-badge">{vi ? 'Quảng cáo' : 'Ad'}</span>
            </div>
            <div className="market-card-body">
              <strong>{item.title}</strong>
              <p className="muted">{shopName(item)} · {item.city}</p>
              <div className="price">{money(item.price)}</div>
            </div>
          </Link>
        ))}
        {!ads.length && <p className="muted">{vi ? 'Chưa có khóa quảng cáo ở khu vực này.' : 'No promoted courses in this area.'}</p>}
      </div>
    </section>
  )
}
