import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

interface Article { id: number; title: string; body: string }

export default function HelpPage() {
  const { locale } = useI18n()
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    axiosClient.get(`/api/assist/help?locale=${locale}`).then((res) => setArticles(res.data.data || [])).catch(() => {})
  }, [locale])

  return (
    <div className="page">
      <h1>{locale === 'vi' ? 'Trợ giúp & hỗ trợ' : 'Help and Support'}</h1>
      <p className="muted">
        {locale === 'vi'
          ? 'Bấm bóng chat góc phải để hỏi trợ lý AI — khung chat đi theo bạn khi lướt trang.'
          : 'Tap the chat bubble at the bottom right to ask the AI assistant. It stays with you as you browse.'}
      </p>
      {articles.map((a) => (
        <div key={a.id} className="card" style={{ marginBottom: 8 }}>
          <div className="body"><strong>{a.title}</strong><p>{a.body}</p></div>
        </div>
      ))}
    </div>
  )
}
