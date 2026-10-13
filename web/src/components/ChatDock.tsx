import { FormEvent, useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { adminThreadId, ensureThread, lastActivity, markThreadRead, openChat, sendMail, teacherThreadId, unreadCount, unreadInThread, visibleThreads, type Thread } from '../lib/inbox'

interface FoundUser {
  id: number
  username: string
  fullName: string
  email?: string
  role: string
}

function fold(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function roleLabel(role: string, vi: boolean) {
  if (role === 'ADMIN') return vi ? 'Quản trị' : 'Admin'
  if (role === 'INSTRUCTOR') return vi ? 'Giảng viên' : 'Instructor'
  if (role === 'ORG_ADMIN') return vi ? 'Doanh nghiệp' : 'Organization'
  return vi ? 'Học viên' : 'Learner'
}

export default function ChatDock() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<FoundUser[]>([])
  const [searching, setSearching] = useState(false)
  const [tick, setTick] = useState(0)
  const admin = user?.role === 'ADMIN'
  void tick

  const refresh = () => setTick((n) => n + 1)

  useEffect(() => {
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      setOpen(true)
      setActive(id)
      refresh()
    }
    window.addEventListener('lh-open-chat', onOpen)
    return () => window.removeEventListener('lh-open-chat', onOpen)
  }, [])

  const mine = user
    ? [...visibleThreads(user.id, user.role)].sort((a, b) => lastActivity(b) - lastActivity(a))
    : []
  const current = mine.find((row) => row.id === active) || null
  const unread = user ? unreadCount(user.id, user.role) : 0

  useEffect(() => {
    if (!user || !open || !active) return
    if (markThreadRead(user.id, active)) refresh()
  }, [user, open, active, tick])

  const talkAdmin = () => {
    if (!user) return
    const row = ensureThread({
      id: adminThreadId(user.id),
      kind: 'admin',
      title: vi ? 'Admin LearnHub' : 'LearnHub admin',
      peerId: 0,
      peerName: user.fullName || user.username,
      learnerId: user.id,
      learnerName: user.fullName || user.username,
    })
    setActive(row.id)
    refresh()
  }

  useEffect(() => {
    if (!admin) return
    const q = query.trim()
    if (!q) {
      setFound([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const handle = window.setTimeout(async () => {
      const tokens = fold(q).split(/\s+/).filter(Boolean)
      const seed = tokens.reduce((best, token) => (token.length > best.length ? token : best), tokens[0] || q)
      setSearching(true)
      try {
        const res = await axiosClient.get('/api/users', { params: { keyword: seed, size: 30 } })
        if (cancelled) return
        const rows: FoundUser[] = Array.isArray(res.data?.data) ? res.data.data : []
        setFound(rows.filter((person) => {
          if (user && person.id === user.id) return false
          const hay = fold(`${person.fullName} ${person.username} ${person.email || ''}`)
          return tokens.every((token) => hay.includes(token))
        }))
      } catch {
        if (!cancelled) setFound([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 280)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [admin, query, user])

  const startWith = (person: FoundUser) => {
    const row = ensureThread({
      id: adminThreadId(person.id),
      kind: 'admin',
      title: person.fullName || person.username,
      peerId: person.id,
      peerName: person.fullName || person.username,
      learnerId: person.id,
      learnerName: person.fullName || person.username,
    })
    setActive(row.id)
    setQuery('')
    setFound([])
    refresh()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!user || !current || !draft.trim()) return
    sendMail(current.id, user.id, user.fullName || user.username, draft)
    setDraft('')
    refresh()
  }

  return (
    <div className="msg-dock">
      {open && (
        <section className="ai-chat-panel" aria-label={vi ? 'Tin nhắn' : 'Messages'}>
          <header>
            <strong>{current ? current.title : (vi ? 'Tin nhắn' : 'Messages')}</strong>
            {current && <button type="button" className="ghost" onClick={() => setActive(null)}>{vi ? 'Danh sách' : 'List'}</button>}
          </header>
          {!user && <p className="muted" style={{ padding: 16 }}>{vi ? 'Đăng nhập để nhắn admin hoặc giảng viên.' : 'Sign in to message admin or an instructor.'}</p>}
          {user && !current && admin && (
            <div className="msg-find">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={vi ? 'Tìm theo tên, tài khoản hoặc email' : 'Search name, username, or email'}
              />
            </div>
          )}
          {user && !current && (
            <div className="ai-chat-log">
              {unread > 0 && (
                <p className="msg-unread-note">
                  {vi ? `Bạn có ${unread} tin nhắn chưa đọc` : `You have ${unread} unread messages`}
                </p>
              )}
              {!admin && (
                <button type="button" onClick={talkAdmin}>{vi ? 'Nhắn admin' : 'Message admin'}</button>
              )}
              {admin && query.trim() && (
                <>
                  <p className="msg-hint">{vi ? 'Người khớp' : 'Matches'}</p>
                  {searching && <p className="muted">{vi ? 'Đang tìm…' : 'Searching…'}</p>}
                  {found.map((person) => (
                    <button key={person.id} type="button" className="msg-hit" onClick={() => startWith(person)}>
                      <strong>{person.fullName || person.username}</strong>
                      <span>{roleLabel(person.role, vi)} · {person.username}</span>
                    </button>
                  ))}
                  {!searching && found.length === 0 && (
                    <p className="muted">{vi ? 'Không thấy người khớp từ khóa này.' : 'No one matches that search.'}</p>
                  )}
                </>
              )}
              {(!admin || !query.trim()) && mine.map((row) => (
                <button key={row.id} type="button" className={`msg-hit${unreadInThread(user.id, row) > 0 ? ' unread' : ''}`} onClick={() => setActive(row.id)}>
                  <strong>{labelOf(row, user.id, vi)}</strong>
                  <span>{row.messages[row.messages.length - 1]?.text || (vi ? 'Chưa có tin nhắn' : 'No messages yet')}</span>
                  {unreadInThread(user.id, row) > 0 && <em>{unreadInThread(user.id, row)}</em>}
                </button>
              ))}
              {!query.trim() && !mine.length && (
                <p className="muted">
                  {admin
                    ? (vi ? 'Chưa có cuộc trò chuyện. Gõ tên để nhắn người mới.' : 'No conversations yet. Type a name to start one.')
                    : (vi ? 'Chưa có cuộc trò chuyện.' : 'No conversations yet.')}
                </p>
              )}
            </div>
          )}
          {user && current && (
            <>
              <div className="ai-chat-log">
                {current.messages.map((mail) => (
                  <p key={mail.id} className={mail.fromId === user.id ? 'mine' : 'bot'}>
                    <strong>{mail.fromName}: </strong>{mail.text}
                  </p>
                ))}
                {!current.messages.length && <p className="muted">{vi ? 'Hãy gửi tin đầu tiên.' : 'Send the first message.'}</p>}
              </div>
              <form onSubmit={submit}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={vi ? 'Nhập tin nhắn' : 'Type a message'} />
                <button type="submit">{vi ? 'Gửi' : 'Send'}</button>
              </form>
            </>
          )}
        </section>
      )}
      <button
        type="button"
        className="ai-chat-bubble"
        aria-expanded={open}
        aria-label={unread > 0 ? (vi ? `Tin nhắn, ${unread} chưa đọc` : `Messages, ${unread} unread`) : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? (vi ? 'Đóng' : 'Close') : (vi ? 'Tin nhắn' : 'Messages')}</span>
        {!open && unread > 0 && <i className="msg-badge">{unread > 99 ? '99+' : unread}</i>}
      </button>
    </div>
  )
}

function labelOf(row: Thread, me: number, vi: boolean) {
  if (row.kind === 'admin') {
    return me === row.learnerId ? (vi ? 'Admin LearnHub' : 'LearnHub admin') : (row.learnerName || row.peerName)
  }
  if (row.instructorId === me) return `${row.learnerName || row.peerName}${row.courseTitle ? ` · ${row.courseTitle}` : ''}`
  return row.peerName || row.courseTitle || (vi ? 'Giảng viên' : 'Instructor')
}

export function messageTeacher(input: {
  instructorId: number
  instructorName: string
  learnerId: number
  learnerName: string
  courseTitle: string
  courseSlug: string
}) {
  const row = ensureThread({
    id: teacherThreadId(input.instructorId, input.learnerId, input.courseSlug),
    kind: 'teacher',
    title: input.courseTitle,
    peerId: input.instructorId,
    peerName: input.instructorName,
    instructorId: input.instructorId,
    learnerId: input.learnerId,
    learnerName: input.learnerName,
    courseTitle: input.courseTitle,
    courseSlug: input.courseSlug,
  })
  openChat(row.id)
}
