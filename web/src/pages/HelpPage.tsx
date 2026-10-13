import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

interface Article {
  id: number
  slug: string
  title: string
  body: string
  audience?: string
}

const GROUPS = [
  { id: 'buyer', vi: 'Người mua', en: 'Buyers' },
  { id: 'seller', vi: 'Người bán', en: 'Sellers' },
  { id: 'admin', vi: 'Quản trị', en: 'Admins' },
  { id: 'all', vi: 'Dùng chung', en: 'Everyone' },
]

const RELATED: Record<string, { to: string; vi: string; en: string }> = {
  refund: { to: '/cart', vi: 'Đến giỏ hàng', en: 'Go to cart' },
  coupon: { to: '/cart', vi: 'Đến giỏ hàng', en: 'Go to cart' },
  gift: { to: '/cart', vi: 'Đến giỏ hàng', en: 'Go to cart' },
  certificate: { to: '/certificates', vi: 'Đến chứng chỉ', en: 'Go to certificates' },
}

export default function HelpPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [articles, setArticles] = useState<Article[]>([])
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    const load = async () => {
      try {
        const first = await axiosClient.get(`/api/assist/help?locale=${locale}`)
        let list: Article[] = first.data.data || []
        if (!list.length && locale !== 'vi') {
          const fallback = await axiosClient.get('/api/assist/help?locale=vi')
          list = fallback.data.data || []
        }
        if (!cancelled) {
          setArticles(list)
          setOpenId(list[0]?.id ?? null)
        }
      } catch {
        if (!cancelled) {
          setArticles([])
          setFailed(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [locale])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return articles
    return articles.filter((article) =>
      article.title.toLowerCase().includes(q) || article.body.toLowerCase().includes(q) || article.slug.includes(q))
  }, [articles, query])

  return (
    <div className="page help-page">
      <header className="help-hero">
        <p>{vi ? 'Trung tâm hỗ trợ' : 'Support center'}</p>
        <h1>{vi ? 'Trợ giúp' : 'Help'}</h1>
        <p className="muted">
          <Link to="/terms">{vi ? 'Điều khoản sử dụng' : 'Terms of use'}</Link>
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={vi ? 'Tìm hoàn tiền, mã giảm giá, chứng chỉ...' : 'Search refunds, coupons, certificates...'}
        />
      </header>

      {loading && <p className="muted">{vi ? 'Đang tải bài hướng dẫn...' : 'Loading articles...'}</p>}
      {failed && (
        <p className="err">{vi ? 'Không tải được bài trợ giúp. Hãy tải lại trang.' : 'Could not load help articles. Reload the page.'}</p>
      )}
      {!loading && !failed && shown.length === 0 && (
        <p className="muted">{vi ? 'Không có bài nào khớp từ khóa này.' : 'No articles match that search.'}</p>
      )}

      {GROUPS.map((group) => {
        const rows = shown.filter((article) => (article.audience || 'all') === group.id)
        if (!rows.length) return null
        return (
          <section key={group.id} className="help-group">
            <h2>{vi ? group.vi : group.en}</h2>
            <div className="help-list">
              {rows.map((article) => {
                const open = openId === article.id
                const related = RELATED[article.slug]
                return (
                  <article key={article.id} className={open ? 'help-item open' : 'help-item'}>
                    <button type="button" onClick={() => setOpenId(open ? null : article.id)} aria-expanded={open}>
                      <span>{article.title}</span>
                      <span aria-hidden="true">{open ? '–' : '+'}</span>
                    </button>
                    {open && (
                      <div className="help-body">
                        <p>{article.body}</p>
                        {related && (
                          <Link to={related.to}>{vi ? related.vi : related.en}</Link>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
