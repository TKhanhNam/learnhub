import { useEffect, useState } from 'react'
import axiosClient from '../api/axiosClient'
import { useI18n } from '../context/I18nContext'

export default function AdminAiPage() {
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const [percent, setPercent] = useState(5)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    axiosClient.get('/api/assist/ai-fee').then((r) => {
      setPercent(r.data.data?.extraPercent ?? 5)
      setNote(r.data.data?.note || '')
    }).catch(() => {})
  }, [])

  return (
    <div>
      <h2>{vi ? 'Phí trợ lý AI' : 'AI assistant fee'}</h2>
      <p className="muted">{vi ? 'Khi khóa bật AI, sàn đớp thêm % trên phần giảng viên (cộng với 30% phí sàn).' : 'When a course enables AI, the platform takes an extra % on top of the 30% cut.'}</p>
      <p>{note}</p>
      <div className="row">
        <input type="number" min={0} max={30} value={percent} onChange={(e) => setPercent(Number(e.target.value))} style={{ width: 100 }} />
        <button onClick={async () => {
          const r = await axiosClient.patch('/api/assist/admin/ai-fee', { extraPercent: percent })
          setNote(r.data.data?.note)
          setMsg(r.data.message)
        }}>{vi ? 'Lưu' : 'Save'}</button>
      </div>
      {msg && <p>{msg}</p>}
    </div>
  )
}
