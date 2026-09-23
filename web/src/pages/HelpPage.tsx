import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'

interface Article { id: number; title: string; body: string }

export default function HelpPage() {
  const { locale } = useI18n()
  const [articles, setArticles] = useState<Article[]>([])
  const [question, setQuestion] = useState('coupon')
  const [answer, setAnswer] = useState<string | null>(null)
  const [fee, setFee] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    axiosClient.get(`/api/assist/help?locale=${locale}`).then((res) => setArticles(res.data.data || [])).catch(() => {})
    axiosClient.get('/api/assist/ai-fee').then((res) => setFee(res.data.data?.note)).catch(() => {})
  }, [locale])

  return (
    <div className="page">
      <h1>{locale === 'vi' ? 'Trợ giúp & hỗ trợ' : 'Help and Support'}</h1>
      {articles.map((a) => (
        <div key={a.id} className="card" style={{ marginBottom: 8 }}>
          <div className="body"><strong>{a.title}</strong><p>{a.body}</p></div>
        </div>
      ))}
      <h3>{locale === 'vi' ? 'Trợ lý AI' : 'AI assistant'}</h3>
      {fee && <p className="muted">{fee}</p>}
      <input value={question} onChange={(e) => setQuestion(e.target.value)} />
      <button style={{ marginTop: 8 }} onClick={async () => {
        if (!isAuthenticated) {
          setAnswer(locale === 'vi' ? 'Đăng nhập để hỏi trợ lý.' : 'Log in to chat with the assistant.')
          return
        }
        const res = await axiosClient.post('/api/assist/chat', { question })
        setAnswer(res.data.data.answer)
      }}>{locale === 'vi' ? 'Hỏi' : 'Ask'}</button>
      {answer && <p>{answer}</p>}
    </div>
  )
}
