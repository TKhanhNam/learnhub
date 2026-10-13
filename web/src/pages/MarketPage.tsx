import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CITIES, LEVELS, type Offer, levelLabel, loadOffers, money, saveRegion, savedRegion, shopName } from '../data/courseMarket'
import { hiddenSlugs } from '../lib/buyerStore'
import { useI18n } from '../context/I18nContext'
import FavButton from '../components/FavButton'

export default function MarketPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [params, setParams] = useSearchParams()
  const [keyword, setKeyword] = useState(params.get('q') || '')
  const [offers, setOffers] = useState<Offer[]>([])

  useEffect(() => {
    let cancelled = false
    loadOffers().then((rows) => { if (!cancelled) setOffers(rows) })
    return () => { cancelled = true }
  }, [])

  const category = params.get('category') || ''
  const city = params.get('city') ?? savedRegion()
  const level = params.get('level') || ''
  const categories = [...new Set(offers.map((item) => item.category))]

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'city') saveRegion(value)
    setParams(next)
  }

  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return offers.filter((item) => {
      if (hiddenSlugs().includes(item.slug)) return false
      if (category && item.category !== category) return false
      if (city && item.city !== city) return false
      if (level && item.level !== level) return false
      if (!q) return true
      return `${item.title} ${item.subtitle} ${item.instructorName} ${item.category}`.toLowerCase().includes(q)
    })
  }, [offers, keyword, category, city, level])

  return (
    <div className="page market-page">
      <header className="learner-hero">
        <p>{vi ? 'Tin khóa học' : 'Course listings'}</p>
        <h1>{vi ? 'Chợ khóa học' : 'Course market'}</h1>
      </header>
      <form className="market-bar" onSubmit={(e) => e.preventDefault()}>
        <label className="market-search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={vi ? 'Tìm tên khóa, giảng viên...' : 'Search course or instructor...'} />
        </label>
        <label className="market-field">
          <span>{vi ? 'Danh mục' : 'Category'}</span>
          <select value={category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">{vi ? 'Tất cả' : 'All'}</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="market-field">
          <span>{vi ? 'Khu vực' : 'Area'}</span>
          <select value={city} onChange={(e) => setFilter('city', e.target.value)}>
            <option value="">{vi ? 'Tất cả' : 'All'}</option>
            {CITIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="market-field">
          <span>{vi ? 'Trình độ' : 'Level'}</span>
          <select value={level} onChange={(e) => setFilter('level', e.target.value)}>
            <option value="">{vi ? 'Tất cả' : 'All'}</option>
            {LEVELS.map((item) => <option key={item.id} value={item.id}>{vi ? item.vi : item.en}</option>)}
          </select>
        </label>
      </form>
      <p className="market-count">{rows.length} {vi ? 'khóa học' : 'courses'}</p>
      <div className="market-grid">
        {rows.map((item) => (
          <div key={item.slug} className="market-card">
            <FavButton slug={item.slug} />
            <Link to={`/market/${item.slug}`}>
            <div className="market-photo" style={{ background: `linear-gradient(145deg, hsl(${item.hue} 70% 46%), hsl(${item.hue} 40% 22%))` }}>
              {item.ad && <span className="ad-badge">{vi ? 'Quảng cáo' : 'Ad'}</span>}
            </div>
            <div className="market-card-body">
              <strong>{item.title}</strong>
              <p className="muted">{levelLabel(item.level, vi)} · {item.city}</p>
              <p className="muted">{shopName(item)}</p>
              <div className="price">{money(item.price)}</div>
            </div>
          </Link>
          </div>
        ))}
      </div>
      {!rows.length && <p className="muted">{vi ? 'Không có khóa khớp bộ lọc.' : 'No courses match these filters.'}</p>}
    </div>
  )
}
