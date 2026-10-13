import { FormEvent, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import axiosClient from '../api/axiosClient'
import { exportFromQuestion, gatherBriefing, localAnswer, pickAnswer, runExport } from '../lib/aiCare'

interface Bubble {
  from: 'bot' | 'user'
  text: string
}

function roleName(role: string | undefined, vi: boolean) {
  if (role === 'ADMIN') return vi ? 'Quản trị' : 'Admin'
  if (role === 'INSTRUCTOR') return vi ? 'Người bán' : 'Seller'
  if (role === 'ORG_ADMIN') return vi ? 'Doanh nghiệp' : 'Business'
  if (role === 'STUDENT') return vi ? 'Người mua' : 'Buyer'
  return vi ? 'Khách' : 'Guest'
}

function roleHint(role: string | undefined, vi: boolean) {
  if (role === 'ADMIN') {
    return vi
      ? 'AI quản trị. Hỏi doanh thu, coupon, đơn tháng này, khóa chờ duyệt — sẽ trả số. Bảo xuất Excel thì file tải về máy.'
      : 'Admin AI. Ask for revenue, coupons, this month’s orders, pending courses. Say export Excel to download a file.'
  }
  if (role === 'INSTRUCTOR') {
    return vi
      ? 'AI người bán. Hỏi doanh thu, thực lĩnh, voucher, hồ sơ nhận tiền — sẽ trả số. Bảo xuất Excel thì file tải về.'
      : 'Seller AI. Ask for payout, vouchers, KYC. Say export Excel to download a file.'
  }
  if (role === 'ORG_ADMIN') {
    return vi
      ? 'AI người mua cho doanh nghiệp. Hỏi giỏ hàng, đơn, khóa đang học, chứng chỉ, hoặc cấp khóa nhân sự.'
      : 'Business buyer AI. Ask about cart, orders, courses, certificates, or assigning courses.'
  }
  if (role === 'STUDENT') {
    return vi
      ? 'AI người mua. Hỏi giỏ hàng, đơn mua, khóa đang học, chứng chỉ — sẽ trả số. Bảo xuất Excel thì file tải về.'
      : 'Buyer AI. Ask about cart, orders, courses, certificates. Say export Excel to download a file.'
  }
  return vi
    ? 'AI người mua cho khách. Đăng nhập để xem số liệu đúng vai trò.'
    : 'Buyer AI for guests. Sign in for live figures for your role.'
}

function accountKey(id: number | undefined, role: string | undefined) {
  return id ? `${id}:${role || ''}` : 'guest'
}

function readLog(key: string): Bubble[] {
  try {
    const raw = sessionStorage.getItem(`lh-ai-care:${key}`)
    const parsed = raw ? JSON.parse(raw) as Bubble[] : []
    return Array.isArray(parsed) ? parsed.filter((item) => item && (item.from === 'bot' || item.from === 'user') && typeof item.text === 'string') : []
  } catch {
    return []
  }
}

export default function AiChatWidget() {
  const { user, isAuthenticated } = useAuth()
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const greeting = roleHint(user?.role, vi)
  const who = accountKey(user?.id, user?.role)
  const owner = useRef(who)
  const [messages, setMessages] = useState<Bubble[]>(() => readLog(who))
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (owner.current !== who) {
      owner.current = who
      setMessages(readLog(who))
      setText('')
      return
    }
    sessionStorage.setItem(`lh-ai-care:${who}`, JSON.stringify(messages))
  }, [messages, who])

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight)
  }, [messages, open])

  const ask = async (event: FormEvent) => {
    event.preventDefault()
    const question = text.trim()
    if (!question || busy) return
    setText('')
    setMessages((prev) => [...prev, { from: 'user', text: question }])
    setBusy(true)
    const briefing = await gatherBriefing(user?.role, user?.id)
    let parsed = { text: localAnswer(question, briefing, user?.role, vi), exportKind: null as ReturnType<typeof exportFromQuestion> }
    try {
      const path = isAuthenticated ? '/api/assist/chat' : '/api/assist/guest-chat'
      const res = await axiosClient.post(path, { question, briefing })
      const aiText = res.data?.data?.answer
      if (aiText) parsed = pickAnswer(aiText, question, briefing, user?.role, vi)
    } catch {
      /* keep local figures */
    }
    const exportKind = parsed.exportKind || exportFromQuestion(question, user?.role)
    let textOut = parsed.text
    if (exportKind) {
      try {
        textOut = `${textOut}\n${await runExport(exportKind)}`.trim()
      } catch {
        textOut = `${textOut}\n${vi ? 'Không xuất được file. Hãy chạy commerce/catalog/identity rồi hỏi lại.' : 'Could not export. Start commerce/catalog/identity and ask again.'}`
      }
    }
    setMessages((prev) => [...prev, { from: 'bot', text: textOut }])
    setBusy(false)
  }

  return (
    <div className="ai-chat">
      {open && (
        <section className="ai-chat-panel" aria-label={vi ? 'Trợ lý' : 'Assistant'}>
          <header>
            <strong>AI Care</strong>
            <span>{roleName(user?.role, vi)}</span>
          </header>
          <div className="ai-chat-log" ref={logRef}>
            <p className="bot">{greeting}</p>
            {messages.map((item, index) => (
              <p key={index} className={item.from === 'user' ? 'mine' : 'bot'}>{item.text}</p>
            ))}
          </div>
          <form onSubmit={ask}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={vi ? 'Hỏi doanh thu, coupon, xuất Excel...' : 'Ask for revenue, coupons, Excel...'}
            />
            <button type="submit" disabled={busy}>{busy ? '...' : (vi ? 'Gửi' : 'Send')}</button>
          </form>
        </section>
      )}
      <button type="button" className="ai-chat-bubble" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 16.5V7.8A2.8 2.8 0 0 1 8.8 5h8.4A2.8 2.8 0 0 1 20 7.8v5.4A2.8 2.8 0 0 1 17.2 16H9.2L6 18.6V16.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}
        <span>{open ? (vi ? 'Đóng' : 'Close') : 'AI Care'}</span>
      </button>
    </div>
  )
}
