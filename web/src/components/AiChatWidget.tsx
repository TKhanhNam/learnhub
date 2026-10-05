import { FormEvent, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'

interface ChatMsg {
  id: string
  role: 'user' | 'ai'
  text: string
}

function courseIdFromPath(pathname: string): number | undefined {
  const match = pathname.match(/^\/learn\/(\d+)/)
  return match ? Number(match[1]) : undefined
}

function guestAnswer(question: string, vi: boolean): string {
  const q = question.toLowerCase()
  const aboutRegister = /đăng ký|dang ky|tạo tài khoản|tao tai khoan|sign up|register|tham gia|học viên|giảng viên|email|họ tên/.test(q)
  const aboutLogin = /đăng nhập|dang nhap|login|mật khẩu|mat khau|password|tài khoản|tai khoan|username|tên đăng nhập|quên mật|vao trang|vào trang/.test(q)
  const greeting = /^(xin chào|chào|hello|hi|hey)\b/.test(q.trim())
  if (!aboutRegister && !aboutLogin && !greeting) {
    return vi
      ? 'Mình chỉ hướng dẫn đăng nhập và đăng ký. Hỏi mình cách đăng nhập, hoặc cách tạo tài khoản học viên / giảng viên nhé.'
      : 'I only explain how to log in or create an account.'
  }
  const login = vi
    ? 'Đăng nhập: mở trang Đăng nhập, nhập tên đăng nhập hoặc email, nhập mật khẩu, rồi bấm Đăng nhập. Sai tài khoản hoặc mật khẩu sẽ có báo lỗi. Tài khoản bị khóa thì làm theo lý do trên màn hình và liên hệ hỗ trợ.'
    : 'Log in: open Login, enter your username or email and password, then press Login.'
  const register = vi
    ? 'Đăng ký: bấm Tham gia LearnHub hoặc Đăng ký. Điền tên đăng nhập (3–60 ký tự, chỉ chữ, số, dấu . _ -), email, họ tên và mật khẩu từ 6 ký tự. Chọn Học viên hoặc Giảng viên, rồi bấm Đăng ký. Không tự đăng ký làm admin. Tên hoặc email đã dùng sẽ bị từ chối.'
    : 'Sign up: choose Join LearnHub, fill username, email, name and a password of at least 6 characters, pick Student or Instructor, then submit.'
  if (/đăng ký|dang ky|register|sign up|tham gia/.test(q)) return register
  if (/đăng nhập|dang nhap|login|mật khẩu|mat khau|password/.test(q)) return login
  return vi
    ? `Mình chỉ hướng dẫn đăng nhập và đăng ký.\n\n${login}\n\n${register}`
    : `I only help with login and sign-up.\n\n${login}\n\n${register}`
}

export default function AiChatWidget({ mode = 'learner' }: { mode?: 'learner' | 'admin' }) {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const courseId = courseIdFromPath(location.pathname)
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const guest = mode === 'learner' && !isAuthenticated
  const hello = mode === 'admin'
    ? (vi
      ? 'Mình đọc số liệu LearnHub để báo cáo doanh thu, học viên, giảng viên và tiến độ. Mình chỉ nói theo số đã có.'
      : 'I report LearnHub revenue, learners, instructors, and progress from live numbers only.')
    : guest
      ? (vi
        ? 'Mình chỉ hướng dẫn đăng nhập và đăng ký LearnHub. Hỏi mình cách vào tài khoản, hoặc cách tạo tài khoản học viên / giảng viên.'
        : 'I only explain how to log in or create a LearnHub account.')
      : (vi
        ? 'Mình tư vấn khóa học và thông tin LearnHub: giá, hoàn tiền, mã giảm giá, chứng chỉ.'
        : 'I can help you pick a course and explain how LearnHub works.')
  const [messages, setMessages] = useState<ChatMsg[]>(() => [{ id: 'hello', role: 'ai', text: hello }])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([{ id: 'hello', role: 'ai', text: hello }])
  }, [hello])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const text = question.trim()
    if (!text || busy) return
    setQuestion('')
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text }])
    setBusy(true)
    try {
      const path = mode === 'admin'
        ? '/api/assist/admin/chat'
        : guest
          ? '/api/assist/guest-chat'
          : '/api/assist/chat'
      const res = await axiosClient.post(path, { question: text, courseId })
      const answer = res.data?.data?.answer || (vi ? 'Trợ lý chưa trả lời được.' : 'No answer yet.')
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'ai', text: answer }])
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      const fallback = guest
        ? guestAnswer(text, vi)
        : (apiMessage || (vi ? 'Không gửi được câu hỏi. Thử lại sau.' : 'Could not send that. Try again.'))
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'ai',
          text: fallback,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-float">
      {open && (
        <div className="ai-float-panel" role="dialog" aria-label={vi ? 'Trợ lý AI' : 'AI assistant'}>
          <div className="ai-float-head">
            <div>
              <strong>{mode === 'admin' ? (vi ? 'Trợ lý báo cáo' : 'Report assistant') : (vi ? 'Trợ lý AI' : 'AI assistant')}</strong>
              <p>{mode === 'admin'
                ? (vi ? 'Doanh thu, học viên, giảng viên, tiến độ' : 'Revenue, learners, instructors, progress')
                : guest
                  ? (vi ? 'Chỉ hướng dẫn đăng nhập và đăng ký' : 'Login and sign-up only')
                  : (vi ? 'Tư vấn khóa học và thông tin trang' : 'Courses and site information')}</p>
            </div>
            <button type="button" className="ghost ai-float-close" onClick={() => setOpen(false)} aria-label={vi ? 'Đóng' : 'Close'}>
              ×
            </button>
          </div>
          <div className="ai-float-msgs" ref={listRef}>
            {messages.map((m) => (
              <div key={m.id} className={`ai-float-bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
            {busy && <div className="ai-float-bubble ai muted">{vi ? 'Đang trả lời…' : 'Thinking…'}</div>}
          </div>
          <form className="ai-float-form" onSubmit={send}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={vi ? 'Nhập câu hỏi…' : 'Type a question…'}
              aria-label={vi ? 'Câu hỏi cho trợ lý' : 'Question for the assistant'}
            />
            <button type="submit" disabled={busy || !question.trim()}>{vi ? 'Gửi' : 'Send'}</button>
          </form>
        </div>
      )}
      <button
        type="button"
        className={`ai-float-btn${open ? ' on' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={vi ? 'Mở trợ lý AI' : 'Open AI assistant'}
      >
        <ChatBubbleIcon />
      </button>
    </div>
  )
}

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3.5 5.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm4.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm4.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z"
      />
    </svg>
  )
}
