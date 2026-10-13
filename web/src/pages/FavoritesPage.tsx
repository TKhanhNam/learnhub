import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { favorites } from '../lib/buyerStore'
import { useI18n } from '../context/I18nContext'
import FavButton from '../components/FavButton'

interface Course { id: number; slug: string; title: string; price: number; categoryName?: string }

export default function FavoritesPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [rows, setRows] = useState<Course[]>([])

  useEffect(() => {
    let cancelled = false
    const liked = new Set(favorites())
    fetch('/api/catalog/courses?size=100')
      .then((res) => res.json())
      .then((body) => {
        const list: Course[] = Array.isArray(body?.data) ? body.data : []
        if (!cancelled) setRows(list.filter((item) => liked.has(item.slug)))
      })
      .catch(() => { if (!cancelled) setRows([]) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="page">
      <header className="learner-hero">
        <p>{vi ? 'Khóa học' : 'Courses'}</p>
        <h1>{vi ? 'Yêu thích' : 'Favorites'}</h1>
      </header>
      <div className="market-grid">
        {rows.map((item) => (
          <div key={item.slug} className="market-card">
            <FavButton slug={item.slug} />
            <Link to={`/courses/${item.slug}`}>
              <div className="market-card-body">
                <strong>{item.title}</strong>
                <p className="muted">{item.categoryName}</p>
                <div className="price">{Number(item.price || 0).toLocaleString('vi-VN')} đ</div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      {!rows.length && <p className="muted">{vi ? 'Chưa có khóa yêu thích. Bấm tim trên thẻ khóa hoặc trong trang khóa.' : 'No favorite courses yet. Use the heart on a course card or inside the course.'}</p>}
    </div>
  )
}
