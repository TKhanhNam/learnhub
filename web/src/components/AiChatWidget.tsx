import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import axiosClient from '../api/axiosClient'
import {
  detectAdminNav,
  exportFromQuestion,
  gatherBriefing,
  labelForNav,
  localAnswer,
  pickAnswer,
  runExport,
  stripNav,
} from '../lib/aiCare'

interface Bubble {
  from: 'bot' | 'user'
  text: string
  nav?: { path: string; label: string }
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
      ? 'AI Quản trị. Ra lệnh "mở [chức năng]" (tài khoản, duyệt khóa, doanh thu, kyc, coupon, báo cáo...) để AI tự động chuyển trang. Yêu cầu xuất báo cáo Excel quản trị sàn...'
      : 'Admin AI. Say "open [feature]" to auto-navigate, or ask for revenue, coupons, and platform Excel reports.'
  }
  if (role === 'INSTRUCTOR') {
    return vi
      ? 'AI người bán. Hỏi doanh thu, thực lĩnh, voucher, hồ sơ nhận tiền — sẽ trả số. Bảo xuất Excel thì tải file báo cáo thu nhập riêng.'
      : 'Seller AI. Ask for payout, vouchers, KYC. Say export Excel to download your instructor earnings report.'
  }
  if (role === 'ORG_ADMIN') {
    return vi
      ? 'AI người mua cho doanh nghiệp. Hỏi giỏ hàng, đơn, khóa đang học, chứng chỉ, hoặc cấp khóa nhân sự.'
      : 'Business buyer AI. Ask about cart, orders, courses, certificates, or assigning courses.'
  }
  if (role === 'STUDENT') {
    return vi
      ? 'AI trợ lý LearnHub. Hỏi tư vấn các sản phẩm khóa học (Lập trình, Tiếng Anh, Thiết kế, Tin học), giỏ hàng, đơn mua, khóa đang học, chứng chỉ...'
      : 'LearnHub AI Assistant. Ask for course recommendations (Programming, English, Design, Excel courses), cart, orders, certificates...'
  }
  return vi
    ? 'AI tư vấn LearnHub. Hãy hỏi về các sản phẩm khóa học, lộ trình học tập hoặc chính sách của sàn.'
    : 'LearnHub AI Consultant. Ask about course products, learning tracks, or platform policies.'
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
  const navigate = useNavigate()
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

    // CHỈ CHO PHÉP XUẤT EXCEL KHI VAI TRÒ LÀ ADMIN HOẶC INSTRUCTOR
    const isAllowedToExport = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'
    const exportKind = isAllowedToExport ? (parsed.exportKind || exportFromQuestion(question, user?.role)) : null
    let textOut = parsed.text
    if (exportKind) {
      try {
        textOut = `${textOut}\n${await runExport(exportKind, user?.role)}`.trim()
      } catch {
        textOut = `${textOut}\n${vi ? 'Không xuất được file. Hãy kiểm tra kết nối dịch vụ rồi thử lại.' : 'Could not export. Please check service connection and try again.'}`
      }
    }

    // Xu ly tu dong mo chuc nang cho Admin
    const navCheck = stripNav(textOut)
    textOut = navCheck.text
    let navTarget = navCheck.navPath ? { path: navCheck.navPath, label: labelForNav(navCheck.navPath, vi) } : null

    if (user?.role === 'ADMIN' && !navTarget) {
      const direct = detectAdminNav(question, user?.role, vi)
      if (direct) {
        navTarget = { path: direct.path, label: direct.label }
      }
    }

    // TU DONG CHUYEN TRANG NGAY LAP TUC CHO ADMIN
    if (user?.role === 'ADMIN' && navTarget) {
      navigate(navTarget.path)
    }

    setMessages((prev) => [...prev, { from: 'bot', text: textOut, nav: navTarget || undefined }])
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
              <p key={index} className={item.from === 'user' ? 'mine' : 'bot'}>
                {item.text}
                {item.nav && (
                  <span style={{ display: 'block', marginTop: 8 }}>
                    <button
                      type="button"
                      className="ai-nav-btn"
                      onClick={() => navigate(item.nav!.path)}
                    >
                      🚀 {vi ? `Mở ${item.nav.label}` : `Open ${item.nav.label}`}
                    </button>
                  </span>
                )}
              </p>
            ))}
          </div>
          <form onSubmit={ask}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                user?.role === 'ADMIN'
                  ? (vi ? 'Ra lệnh: mở tài khoản, mở duyệt khóa, mở doanh thu...' : 'Command: open users, courses, revenue...')
                  : (vi ? 'Hỏi tư vấn sản phẩm khóa học, lộ trình học...' : 'Ask for courses, products, paths...')
              }
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
