import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'
import { useAuth } from '../context/AuthContext'
import QaPanel from '../components/QaPanel'

interface Lecture {
  id: number
  title: string
  type: string
  videoUrl: string
  bodyHtml: string
  durationSeconds: number
  downloadUrl?: string
}
interface Question { id: number; prompt: string; optionA: string; optionB: string; optionC: string; optionD: string }
interface Quiz { id: number; title: string; kind: string; passScore: number; questions: Question[] }
interface Assignment { id: number; title: string; instruction: string }
interface Note { id: number; lectureId: number; content: string; timestampSeconds: number }
interface Progress { progressPercent: number; completedLectures: number; totalLectures: number }

export default function PlayerPage() {
  const { courseId } = useParams()
  const id = Number(courseId)
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [current, setCurrent] = useState<Lecture | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [note, setNote] = useState('')
  const [speed, setSpeed] = useState(1)
  const [subs, setSubs] = useState(false)
  const [link, setLink] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [quizId, setQuizId] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [aiQ, setAiQ] = useState('')
  const [aiA, setAiA] = useState<string | null>(null)

  const loadProgress = () => {
    axiosClient.get(`/api/learning/progress/${id}`).then((res) => setProgress(res.data.data)).catch(() => {})
  }

  useEffect(() => {
    axiosClient.get(`/api/content/courses/${id}/curriculum`).then((res) => {
      const data = res.data.data
      setLectures(data.lectures || [])
      setQuizzes(data.quizzes || [])
      setAssignments(data.assignments || [])
      setCurrent(data.lectures?.[0] || null)
    }).catch((err) => setMsg(err.response?.data?.message || (vi ? 'Không tải được nội dung' : 'Could not load content')))
    axiosClient.get(`/api/learning/notes?courseId=${id}`).then((res) => setNotes(res.data.data || [])).catch(() => {})
    loadProgress()
  }, [id])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed, current])

  const complete = async (lecture: Lecture) => {
    await axiosClient.put('/api/learning/progress', {
      courseId: id, lectureId: lecture.id, completed: true, secondsWatched: lecture.durationSeconds,
    })
    setMsg(vi ? 'Đã lưu tiến độ' : 'Progress saved')
    loadProgress()
  }

  const saveNote = async () => {
    if (!current) return
    const ts = Math.floor(videoRef.current?.currentTime || 0)
    await axiosClient.post('/api/learning/notes', {
      courseId: id, lectureId: current.id, timestampSeconds: ts, content: note,
    })
    setNote('')
    const res = await axiosClient.get(`/api/learning/notes?courseId=${id}`)
    setNotes(res.data.data || [])
  }

  const activeQuiz = useMemo(() => quizzes.find((q) => q.id === quizId), [quizzes, quizId])

  const submitQuiz = async () => {
    if (!activeQuiz) return
    const res = await axiosClient.post(`/api/learning/quizzes/${activeQuiz.id}/attempts`, { courseId: id, answers })
    const d = res.data.data
    setMsg(`${activeQuiz.title}: ${d.percent}% ${d.passed ? (vi ? 'Đạt' : 'Passed') : (vi ? 'Chưa đạt' : 'Not passed')}`)
  }

  const askAi = async () => {
    const res = await axiosClient.post('/api/assist/chat', { question: aiQ, courseId: id })
    setAiA(res.data.data.answer)
  }

  return (
    <div className="page player-page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>{current ? current.title : (vi ? 'Chọn bài giảng' : 'Pick a lecture')}</h1>
        <span className="muted">{progress ? `${progress.progressPercent}% · ${progress.completedLectures}/${progress.totalLectures}` : ''}</span>
      </div>
      {current?.type === 'VIDEO' && current.videoUrl && (
        <video ref={videoRef} className="player" src={current.videoUrl} controls onEnded={() => complete(current)}>
          {subs && (
            <track default kind="subtitles" srcLang="vi" label="VI" src="data:text/vtt,WEBVTT%0A%0A00:00:00.000 --> 00:00:08.000%0APhu de demo (VI)%0A" />
          )}
        </video>
      )}
      {current?.type !== 'VIDEO' && current?.bodyHtml && (
        <div className="card" style={{ marginTop: 12 }}><div className="body" dangerouslySetInnerHTML={{ __html: current.bodyHtml }} /></div>
      )}
      {current?.downloadUrl && (
        <p><a href={current.downloadUrl} target="_blank" rel="noreferrer">{vi ? 'Tải slide / PDF / tài liệu' : 'Download slides / PDF'}</a></p>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <span>{vi ? 'Tốc độ' : 'Speed'}</span>
        {[0.75, 1, 1.25, 1.5, 2].map((s) => (
          <button key={s} className="ghost" onClick={() => setSpeed(s)}>{s}x</button>
        ))}
        <button className="ghost" onClick={() => setSubs((v) => !v)}>{subs ? (vi ? 'Tắt phụ đề' : 'Subs off') : (vi ? 'Bật phụ đề' : 'Subs on')}</button>
        {current && <button onClick={() => complete(current)}>{vi ? 'Đánh dấu hoàn thành' : 'Mark complete'}</button>}
      </div>

      <h3>{vi ? 'Giáo trình' : 'Curriculum'}</h3>
      {lectures.map((l) => (
        <div key={l.id} className="card" style={{ marginBottom: 6 }}>
          <div className="body row">
            <button className="ghost" onClick={() => setCurrent(l)}>{l.title}</button>
            <span className="muted">{l.type} · {l.durationSeconds}s</span>
          </div>
        </div>
      ))}

      <h3>{vi ? 'Ghi chú' : 'Notes'}</h3>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      <button onClick={saveNote} style={{ marginTop: 8 }}>{vi ? 'Lưu ghi chú (theo mốc video)' : 'Save note at timestamp'}</button>
      {notes.map((n) => <p key={n.id} className="muted">#{n.lectureId} @{n.timestampSeconds}s: {n.content}</p>)}

      <h3>Quiz</h3>
      {quizzes.filter((q) => q.kind !== 'PRACTICE').map((q) => (
        <button key={q.id} className="ghost" style={{ marginRight: 8 }} onClick={() => { setQuizId(q.id); setAnswers({}) }}>{q.title}</button>
      ))}
      <h3>Practice test</h3>
      {quizzes.filter((q) => q.kind === 'PRACTICE').map((q) => (
        <button key={q.id} className="ghost" style={{ marginRight: 8 }} onClick={() => { setQuizId(q.id); setAnswers({}) }}>{q.title}</button>
      ))}
      {activeQuiz && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="body">
            <strong>{activeQuiz.title}</strong> · pass {activeQuiz.passScore}%
            {(activeQuiz.questions || []).map((q) => (
              <fieldset key={q.id} style={{ border: 0, padding: 0, margin: '12px 0' }}>
                <legend>{q.prompt}</legend>
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const label = opt === 'A' ? q.optionA : opt === 'B' ? q.optionB : opt === 'C' ? q.optionC : q.optionD
                  if (!label) return null
                  return (
                    <label key={opt} className="row">
                      <input type="radio" name={`q${q.id}`} checked={answers[q.id] === opt} onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt }))} style={{ width: 'auto' }} />
                      {opt}. {label}
                    </label>
                  )
                })}
              </fieldset>
            ))}
            <button onClick={submitQuiz}>{vi ? 'Nộp bài' : 'Submit'}</button>
          </div>
        </div>
      )}

      <h3>{vi ? 'Bài tập / coding (nộp link)' : 'Assignments / coding (link)'}</h3>
      {assignments.map((a) => (
        <div key={a.id} className="card" style={{ marginBottom: 8 }}>
          <div className="body">
            <p><strong>{a.title}</strong> — {a.instruction}</p>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://github.com/..." />
            <button style={{ marginTop: 8 }} onClick={async () => {
              await axiosClient.post(`/api/learning/assignments/${a.id}/submissions`, { courseId: id, linkUrl: link, note: '' })
              setMsg(vi ? 'Đã nộp link' : 'Link submitted')
            }}>{vi ? 'Nộp' : 'Submit'}</button>
          </div>
        </div>
      ))}

      <QaPanel courseId={id} canPost canAnswer={user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN'} vi={vi} />

      <h3>{vi ? 'Trợ lý AI (tóm tắt / hỏi bài)' : 'AI assistant'}</h3>
      <div className="row">
        <input className="grow" value={aiQ} onChange={(e) => setAiQ(e.target.value)} placeholder={vi ? 'Hỏi về bài đang học...' : 'Ask about this lesson...'} />
        <button type="button" onClick={askAi}>{vi ? 'Hỏi' : 'Ask'}</button>
      </div>
      {aiA && <p>{aiA}</p>}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost" onClick={async () => {
          const res = await axiosClient.post(`/api/learning/certificates/${id}`)
          setMsg(res.data.message)
        }}>{vi ? 'Xuất chứng chỉ' : 'Issue certificate'}</button>
        <Link to="/certificates">{vi ? 'Xem chứng chỉ' : 'View certificates'}</Link>
      </div>
      {msg && <p>{msg}</p>}
    </div>
  )
}
