export interface Mail {
  id: string
  fromId: number
  fromName: string
  text: string
}

export interface Thread {
  id: string
  kind: 'admin' | 'teacher'
  title: string
  peerId: number
  peerName: string
  instructorId?: number
  learnerId?: number
  learnerName?: string
  courseTitle?: string
  courseSlug?: string
  messages: Mail[]
}

const KEY = 'lh-inbox'

function read(): Thread[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) as Thread[] : []
  } catch {
    return []
  }
}

function write(rows: Thread[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

function nid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function threads() {
  return read()
}

export function adminThreadId(userId: number) {
  return `admin:${userId}`
}

export function teacherThreadId(instructorId: number, learnerId: number, slug: string) {
  return `teach:${instructorId}:${learnerId}:${slug}`
}

export function ensureThread(next: Omit<Thread, 'messages'>) {
  const rows = read()
  const found = rows.find((row) => row.id === next.id)
  if (found) return found
  const created: Thread = { ...next, messages: [] }
  rows.unshift(created)
  write(rows)
  return created
}

export function sendMail(threadId: string, fromId: number, fromName: string, text: string) {
  const rows = read()
  const row = rows.find((item) => item.id === threadId)
  if (!row) return
  row.messages.push({ id: nid(), fromId, fromName, text: text.trim() })
  write(rows)
}

export function buyersOf(instructorId: number) {
  const seen = new Set<string>()
  return read().filter((row) => {
    if (row.kind !== 'teacher' || row.instructorId !== instructorId || !row.learnerId) return false
    const key = String(row.learnerId)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function lastActivity(row: Thread) {
  const last = row.messages[row.messages.length - 1]
  if (!last) return 0
  const stamp = Number(String(last.id).split('-')[0])
  return Number.isFinite(stamp) ? stamp : 0
}

export function openChat(threadId: string) {
  window.dispatchEvent(new CustomEvent('lh-open-chat', { detail: threadId }))
}

const READ_KEY = 'lh-inbox-read'

function readMap(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    return raw ? JSON.parse(raw) as Record<string, Record<string, string>> : {}
  } catch {
    return {}
  }
}

export function visibleThreads(userId: number, role: string) {
  const admin = role === 'ADMIN'
  return read().filter((row) => {
    if (admin) return row.kind === 'admin' || row.instructorId === userId
    return row.id === adminThreadId(userId) || row.learnerId === userId || row.instructorId === userId
  })
}

export function unreadInThread(userId: number, row: Thread) {
  const seen = readMap()[String(userId)]?.[row.id]
  let afterSeen = seen == null
  let count = 0
  for (const mail of row.messages) {
    if (!afterSeen) {
      if (mail.id === seen) afterSeen = true
      continue
    }
    if (mail.fromId !== userId) count += 1
  }
  return count
}

export function unreadCount(userId: number, role: string) {
  return visibleThreads(userId, role).reduce((sum, row) => sum + unreadInThread(userId, row), 0)
}

export function markThreadRead(userId: number, threadId: string) {
  const row = read().find((item) => item.id === threadId)
  const last = row?.messages[row.messages.length - 1]?.id || ''
  const map = readMap()
  const mine = map[String(userId)] || {}
  if (mine[threadId] === last) return false
  mine[threadId] = last
  map[String(userId)] = mine
  localStorage.setItem(READ_KEY, JSON.stringify(map))
  return true
}
