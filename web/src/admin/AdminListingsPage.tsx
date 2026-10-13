import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { type Offer, loadOffers } from '../data/courseMarket'
import { hiddenSlugs, originOf, setHidden, setOrigin } from '../lib/buyerStore'
import { allReports } from '../lib/marketStore'
import { useI18n } from '../context/I18nContext'

const ORIGIN = [
  { id: 'pending', vi: 'Chưa kiểm tra', en: 'Not checked' },
  { id: 'original', vi: 'Giảng viên tự soạn', en: 'Written by the instructor' },
  { id: 'cited', vi: 'Có trích nguồn tài liệu', en: 'Sources cited' },
  { id: 'copied', vi: 'Nghi sao chép', en: 'Possible copy' },
] as const

export default function AdminListingsPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [offers, setOffers] = useState<Offer[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    loadOffers().then(setOffers)
  }, [])

  void tick
  const hidden = new Set(hiddenSlugs())
  const reports = allReports()

  return (
    <div>
      <h1>{vi ? 'Tin trên chợ' : 'Market listings'}</h1>
      <p className="muted">{vi ? 'Duyệt, ẩn tin và kiểm tra nguồn nội dung khóa. Không kiểm tra nguồn gốc máy.' : 'Approve, hide, and check where the course content comes from.'}</p>
      {offers.map((item) => (
        <article key={item.slug} className="card" style={{ marginTop: 10 }}>
          <div className="body">
            <strong>{item.title}</strong>
            <p className="muted">{item.category} · {item.city} · {hidden.has(item.slug) ? (vi ? 'Đang ẩn' : 'Hidden') : (vi ? 'Đang hiện' : 'Visible')}</p>
            <label>
              {vi ? 'Nguồn nội dung' : 'Content source'}
              <select
                value={originOf(item.slug)}
                onChange={(e) => {
                  setOrigin(item.slug, e.target.value as typeof ORIGIN[number]['id'])
                  setTick((n) => n + 1)
                }}
              >
                {ORIGIN.map((row) => <option key={row.id} value={row.id}>{vi ? row.vi : row.en}</option>)}
              </select>
            </label>
            <div className="row">
              <button type="button" className="ghost" onClick={() => { setHidden(item.slug, !hidden.has(item.slug)); setTick((n) => n + 1) }}>
                {hidden.has(item.slug) ? (vi ? 'Hiện lại' : 'Show') : (vi ? 'Ẩn tin' : 'Hide')}
              </button>
              <Link to={`/market/${item.slug}`}>{vi ? 'Xem tin' : 'Open'}</Link>
            </div>
          </div>
        </article>
      ))}
      <h2 style={{ marginTop: 22 }}>{vi ? 'Tin bị báo cáo' : 'Reported listings'}</h2>
      {!reports.length && <p className="muted">{vi ? 'Chưa có báo cáo.' : 'No reports.'}</p>}
      {reports.map((row) => (
        <p key={row.id}>{row.slug} · {row.reason} · <button type="button" className="ghost" onClick={() => { setHidden(row.slug, true); setTick((n) => n + 1) }}>{vi ? 'Ẩn tin này' : 'Hide it'}</button></p>
      ))}
    </div>
  )
}
