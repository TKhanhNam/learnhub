import { FormEvent, useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'

interface Answer { id: number; authorName: string; body: string; userId: number }
interface Question {
  id: number
  title: string
  body: string
  authorName: string
  answers: Answer[]
}

export default function QaPanel({ courseId, canPost, canAnswer, vi }: {
  courseId: number
  canPost: boolean
  canAnswer?: boolean
  vi: boolean
}) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<Question[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [reply, setReply] = useState<Record<number, string>>({})
  const [msg, setMsg] = useState<string | null>(null)

  const load = () => {
    axiosClient.get(`/api/social/questions?courseId=${courseId}`)
      .then((res) => setItems(res.data.data || []))
      .catch(() => setItems([]))
  }

  useEffect(() => { load() }, [courseId])

  const ask = async (e: FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      setMsg(vi ? 'Đăng nhập để đặt câu hỏi.' : 'Log in to ask a question.')
      return
    }
    try {
      await axiosClient.post('/api/social/questions', { courseId, title, body })
      setTitle('')
      setBody('')
      setMsg(vi ? 'Đã gửi câu hỏi.' : 'Question posted.')
      load()
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setMsg(ax.response?.data?.message || (vi ? 'Không gửi được. Cần sở hữu khóa học.' : 'Need course access to ask.'))
    }
  }

  const answer = async (id: number) => {
    const text = (reply[id] || '').trim()
    if (!text) return
    try {
      await axiosClient.post(`/api/social/questions/${id}/answers`, { body: text })
      setReply((prev) => ({ ...prev, [id]: '' }))
      load()
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      setMsg(ax.response?.data?.message || (vi ? 'Không trả lời được.' : 'Could not reply.'))
    }
  }

  return (
    <section>
      <h3>{vi ? 'Hỏi đáp (Q&A)' : 'Q&A'}</h3>
      <p className="muted">{vi ? 'Học viên hỏi, giảng viên và học viên khác trả lời.' : 'Learners ask, instructors and peers reply.'}</p>
      {canPost && (
        <form onSubmit={ask} className="stack" style={{ maxWidth: 640, marginBottom: 16 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={vi ? 'Tiêu đề câu hỏi' : 'Question title'} required />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={vi ? 'Mô tả chi tiết' : 'Details'} required />
          <button type="submit">{vi ? 'Đặt câu hỏi' : 'Ask'}</button>
        </form>
      )}
      {items.map((q) => (
        <article key={q.id} className="card" style={{ marginBottom: 10 }}>
          <div className="body">
            <strong>{q.title}</strong>
            <p className="muted">{q.authorName}</p>
            <p>{q.body}</p>
            {q.answers?.map((a) => (
              <p key={a.id}><b>{a.authorName}:</b> {a.body}</p>
            ))}
            {(canAnswer || canPost) && (
              <div className="row" style={{ marginTop: 8 }}>
                <input
                  className="grow"
                  value={reply[q.id] || ''}
                  onChange={(e) => setReply((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={vi ? 'Trả lời...' : 'Reply...'}
                />
                <button type="button" className="ghost" onClick={() => answer(q.id)}>{vi ? 'Gửi' : 'Send'}</button>
              </div>
            )}
          </div>
        </article>
      ))}
      {items.length === 0 && <p className="muted">{vi ? 'Chưa có câu hỏi.' : 'No questions yet.'}</p>}
      {msg && <p className="muted">{msg}</p>}
    </section>
  )
}
