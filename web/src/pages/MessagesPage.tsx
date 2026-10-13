import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { type Offer, loadOffers } from '../data/courseMarket'
import { adminThread, sendAdmin } from '../lib/buyerStore'
import { threads } from '../lib/marketStore'
import { useI18n } from '../context/I18nContext'

export default function MessagesPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [offers, setOffers] = useState<Offer[]>([])
  const [draft, setDraft] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    loadOffers().then(setOffers)
  }, [])

  const chats = threads()
  void tick
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    sendAdmin(draft)
    setDraft('')
    setTick((n) => n + 1)
  }

  return (
    <div className="page">
      <header className="learner-hero">
        <p>{vi ? 'Người mua' : 'Buyer'}</p>
        <h1>{vi ? 'Tin nhắn' : 'Messages'}</h1>
      </header>
      <section className="learner-panel">
        <h2>{vi ? 'Chat với shop' : 'Shop chats'}</h2>
        {Object.keys(chats).length === 0 && <p className="muted">{vi ? 'Chưa có cuộc chat. Mở một tin khóa và nhắn shop.' : 'No shop chats yet.'}</p>}
        {Object.entries(chats).map(([slug, lines]) => {
          const offer = offers.find((item) => item.slug === slug)
          const last = lines[lines.length - 1]
          return (
            <p key={slug}>
              <Link to={`/market/${slug}`}><strong>{offer?.title || slug}</strong></Link>
              <span className="muted"> — {last?.text}</span>
            </p>
          )
        })}
      </section>
      <form className="learner-panel" onSubmit={submit}>
        <h2>{vi ? 'Chat với admin' : 'Chat with admin'}</h2>
        <div className="chat-log">
          {adminThread().map((line) => (
            <p key={line.id} className={line.from === 'me' ? 'chat-me' : 'chat-shop'}>{line.text}</p>
          ))}
          {!adminThread().length && <p className="muted">{vi ? 'Hỏi admin về mở khóa, khiếu nại hoặc hoàn MoMo.' : 'Ask admin about access, a complaint, or a MoMo refund.'}</p>}
        </div>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={vi ? 'Nhắn admin' : 'Message admin'} />
        <button type="submit">{vi ? 'Gửi' : 'Send'}</button>
      </form>
    </div>
  )
}
