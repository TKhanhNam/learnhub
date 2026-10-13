export interface ExtraReview {
  id: string
  slug: string
  author: string
  rating: number
  text: string
  reply: string
}

export interface ListingReport {
  id: string
  slug: string
  reason: string
}

export interface ChatLine {
  id: string
  from: 'me' | 'shop'
  text: string
}

interface Bag {
  reviews: ExtraReview[]
  reports: ListingReport[]
  chats: Record<string, ChatLine[]>
  replies: Record<string, string>
}

const KEY = 'lh-course-market'

function emptyBag(): Bag {
  return { reviews: [], reports: [], chats: {}, replies: {} }
}

function read(): Bag {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyBag()
    const parsed = JSON.parse(raw) as Partial<Bag>
    return {
      reviews: parsed.reviews || [],
      reports: parsed.reports || [],
      chats: parsed.chats || {},
      replies: parsed.replies || {},
    }
  } catch {
    return emptyBag()
  }
}

function write(bag: Bag) {
  localStorage.setItem(KEY, JSON.stringify(bag))
}

function nid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function extraReviews(slug: string) {
  return read().reviews.filter((row) => row.slug === slug)
}

export function addReview(slug: string, author: string, rating: number, text: string, shop: string) {
  const bag = read()
  bag.reviews.push({
    id: nid(),
    slug,
    author: author.trim() || 'Khách',
    rating,
    text: text.trim(),
    reply: `${shop} đã nhận đánh giá về khóa học và sẽ trả lời bạn.`,
  })
  write(bag)
}

export function allReports() {
  return read().reports
}

export function reportsFor(slug: string) {
  return read().reports.filter((row) => row.slug === slug)
}

export function addReport(slug: string, reason: string) {
  const bag = read()
  bag.reports.push({ id: nid(), slug, reason })
  write(bag)
}

export function replyOf(id: string, fallback: string) {
  return read().replies[id] || fallback
}

export function setReply(id: string, reply: string) {
  const bag = read()
  bag.replies[id] = reply.trim()
  const row = bag.reviews.find((item) => item.id === id)
  if (row) row.reply = reply.trim()
  write(bag)
}

export function allReviews() {
  return read().reviews
}

export function threads() {
  return read().chats
}

export function sendOffer(slug: string, amount: number, shop: string, listPrice: number) {
  const bag = read()
  const lines = bag.chats[slug] ? [...bag.chats[slug]] : []
  lines.push({ id: nid(), from: 'me', text: `Trả giá ${amount.toLocaleString('vi-VN')} đ` })
  const accept = amount >= Math.round(listPrice * 0.85)
  lines.push({
    id: nid(),
    from: 'shop',
    text: accept
      ? `${shop}: Shop chấp nhận giá ${amount.toLocaleString('vi-VN')} đ cho khóa này.`
      : `${shop}: Shop chưa chốt. Giá đang bán là ${listPrice.toLocaleString('vi-VN')} đ, shop có thể nhích xuống khoảng 15%.`,
  })
  bag.chats[slug] = lines
  write(bag)
  return lines
}

export function chatFor(slug: string) {
  return read().chats[slug] || []
}

export function sendChat(slug: string, text: string, shop: string, title: string) {
  const bag = read()
  const lines = bag.chats[slug] ? [...bag.chats[slug]] : []
  lines.push({ id: nid(), from: 'me', text: text.trim() })
  lines.push({
    id: nid(),
    from: 'shop',
    text: `${shop}: Shop đã nhận tin về khóa "${title}". Bạn muốn hỏi học phí, lịch học hay chứng chỉ?`,
  })
  bag.chats[slug] = lines
  write(bag)
  return lines
}
