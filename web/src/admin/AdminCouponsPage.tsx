import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

interface Coupon { id: number; code: string; discountPercent: number; maxUses: number; usedCount: number; active: boolean; ownerType: string }

export default function AdminCouponsPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [items, setItems] = useState<Coupon[]>([])
  const [code, setCode] = useState('SALE15')
  const [pct, setPct] = useState('15')

  const load = () => {
    axiosClient.get('/api/catalog/coupons').then((r) => setItems(r.data.data || [])).catch(() => setItems([]))
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <h2>{vi ? 'Coupon sàn' : 'Platform coupons'}</h2>
      <div className="row">
        <input value={code} onChange={(e) => setCode(e.target.value)} />
        <input value={pct} onChange={(e) => setPct(e.target.value)} style={{ width: 80 }} />
        <button onClick={async () => {
          await axiosClient.post('/api/catalog/coupons', { code, discountPercent: Number(pct), maxUses: 200 })
          load()
        }}>{vi ? 'Tạo' : 'Create'}</button>
      </div>
      {items.map((c) => (
        <div key={c.id} className="card" style={{ marginTop: 8 }}>
          <div className="body row">
            <span className="grow">{c.code} · -{c.discountPercent}% · {c.usedCount}/{c.maxUses} · {c.ownerType}</span>
            {c.active && <button className="ghost" onClick={async () => { await axiosClient.delete(`/api/catalog/coupons/${c.id}`); load() }}>{vi ? 'Ngưng' : 'Disable'}</button>}
          </div>
        </div>
      ))}
    </div>
  )
}
