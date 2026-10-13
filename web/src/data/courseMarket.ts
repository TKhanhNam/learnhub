export const CITIES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ'] as const

export const LEVELS = [
  { id: 'BEGINNER', vi: 'Cơ bản', en: 'Beginner' },
  { id: 'INTERMEDIATE', vi: 'Trung cấp', en: 'Intermediate' },
  { id: 'ADVANCED', vi: 'Nâng cao', en: 'Advanced' },
] as const

export interface Offer {
  id: number
  slug: string
  title: string
  subtitle: string
  description: string
  price: number
  category: string
  level: string
  city: string
  ad: boolean
  hue: number
  instructorId: number
  instructorName: string
}

export interface SeedReview {
  id: string
  slug: string
  author: string
  rating: number
  text: string
  reply: string
}

import { withEdits } from '../lib/buyerStore'

const REGION_KEY = 'lh-region'

export function savedRegion() {
  return localStorage.getItem(REGION_KEY) || ''
}

export function saveRegion(city: string) {
  localStorage.setItem(REGION_KEY, city)
}

export function money(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`
}

export function levelLabel(level: string, vi: boolean) {
  const row = LEVELS.find((item) => item.id === level)
  if (!row) return vi ? 'Trung cấp' : 'Intermediate'
  return vi ? row.vi : row.en
}

function cityOf(id: number) {
  return CITIES[Math.abs(id) % CITIES.length]
}

function hueOf(id: number) {
  return (Math.abs(id) * 47) % 360
}

export const FALLBACK: Offer[] = [
  {
    id: 101, slug: 'java-co-ban', title: 'Java cơ bản cho người mới', subtitle: 'Biến, vòng lặp, hướng đối tượng',
    description: 'Khóa nhập môn Java, có bài tập cuối mỗi chương và chứng chỉ khi hoàn thành.',
    price: 499000, category: 'Lập trình', level: 'BEGINNER', city: 'Hà Nội', ad: true, hue: 210,
    instructorId: 11, instructorName: 'Mai Lan',
  },
  {
    id: 102, slug: 'ielts-writing', title: 'IELTS Writing 6.5', subtitle: 'Task 1 và Task 2',
    description: 'Luyện dàn ý, từ vựng học thuật và chữa bài viết mẫu.',
    price: 790000, category: 'Ngoại ngữ', level: 'INTERMEDIATE', city: 'TP. Hồ Chí Minh', ad: true, hue: 262,
    instructorId: 12, instructorName: 'Trần Khoa',
  },
  {
    id: 103, slug: 'ui-can-ban', title: 'Thiết kế giao diện căn bản', subtitle: 'Bố cục, màu, chữ',
    description: 'Làm landing page cho một sản phẩm học tập, từ phác thảo đến bản giao.',
    price: 650000, category: 'Thiết kế', level: 'BEGINNER', city: 'Đà Nẵng', ad: false, hue: 188,
    instructorId: 13, instructorName: 'Lê Hà',
  },
  {
    id: 104, slug: 'excel-cong-viec', title: 'Excel cho công việc', subtitle: 'Hàm, bảng, biểu đồ',
    description: 'Dùng Excel để theo dõi doanh thu khóa học và làm báo cáo.',
    price: 350000, category: 'Tin học', level: 'BEGINNER', city: 'Hà Nội', ad: true, hue: 24,
    instructorId: 11, instructorName: 'Mai Lan',
  },
  {
    id: 105, slug: 'spring-boot', title: 'Spring Boot thực hành', subtitle: 'API và cơ sở dữ liệu',
    description: 'Xây một dịch vụ nhỏ: đăng ký, khóa học, và phân quyền.',
    price: 890000, category: 'Lập trình', level: 'ADVANCED', city: 'TP. Hồ Chí Minh', ad: false, hue: 152,
    instructorId: 12, instructorName: 'Trần Khoa',
  },
  {
    id: 106, slug: 'thuyet-trinh', title: 'Thuyết trình tự tin', subtitle: 'Dàn ý và nói trước lớp',
    description: 'Luyện mở bài, giữ nhịp và trả lời câu hỏi. Có buổi thực hành.',
    price: 420000, category: 'Phát triển bản thân', level: 'INTERMEDIATE', city: 'Cần Thơ', ad: false, hue: 340,
    instructorId: 13, instructorName: 'Lê Hà',
  },
  {
    id: 107, slug: 'sql-truy-van', title: 'SQL truy vấn dữ liệu', subtitle: 'SELECT, JOIN, nhóm',
    description: 'Đọc dữ liệu học viên, đơn hàng và tiến độ học.',
    price: 540000, category: 'Tin học', level: 'INTERMEDIATE', city: 'Đà Nẵng', ad: true, hue: 200,
    instructorId: 13, instructorName: 'Lê Hà',
  },
  {
    id: 108, slug: 'marketing-khoa-hoc', title: 'Marketing cho khóa học', subtitle: 'Nội dung và quảng cáo',
    description: 'Cách viết tin khóa học và chọn kênh quảng cáo phù hợp.',
    price: 610000, category: 'Marketing', level: 'BEGINNER', city: 'TP. Hồ Chí Minh', ad: false, hue: 48,
    instructorId: 12, instructorName: 'Trần Khoa',
  },
]

export const SEED_REVIEWS: SeedReview[] = [
  {
    id: 'r1', slug: 'java-co-ban', author: 'Minh Anh', rating: 5,
    text: 'Giải thích rõ, bài tập vừa sức người mới.',
    reply: 'Mai Lan cảm ơn bạn. Cứ nhắn shop nếu kẹt bài tập.',
  },
  {
    id: 'r2', slug: 'ielts-writing', author: 'Hoàng Long', rating: 4,
    text: 'Bài chữa cụ thể, phần từ vựng hơi dày.',
    reply: 'Trần Khoa đã ghi nhận. Shop sẽ tách phần từ vựng thành phiếu ngắn hơn.',
  },
  {
    id: 'r3', slug: 'excel-cong-viec', author: 'Thu Hà', rating: 5,
    text: 'Áp dụng được ngay vào bảng theo dõi lớp.',
    reply: 'Shop cảm ơn bạn. File mẫu nằm ở bài cuối.',
  },
]

interface CatalogCourse {
  id: number
  slug: string
  title: string
  subtitle?: string
  description?: string
  price?: number
  categoryName?: string
  level?: string
  instructorId?: number
}

let cache: Promise<Offer[]> | null = null

async function instructorName(id: number) {
  try {
    const body = await fetch(`/api/users/${id}/public`).then((res) => res.json())
    const name = body?.data?.fullName
    if (typeof name === 'string' && name.trim()) return name.trim()
  } catch {
    // catalog có thể chạy khi identity chưa bật
  }
  return `Giảng viên ${id}`
}

function fromCatalog(course: CatalogCourse, name: string): Offer {
  const id = Number(course.id)
  return {
    id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle || '',
    description: course.description || course.subtitle || 'Khóa học trên LearnHub.',
    price: Number(course.price || 0),
    category: course.categoryName || 'LearnHub',
    level: course.level || 'INTERMEDIATE',
    city: cityOf(id),
    ad: id % 4 === 0,
    hue: hueOf(id),
    instructorId: Number(course.instructorId || 0),
    instructorName: name,
  }
}

export function loadOffers() {
  if (!cache) {
    cache = (async () => {
      try {
        const body = await fetch('/api/catalog/courses?size=100').then((res) => res.json())
        const list: CatalogCourse[] = Array.isArray(body?.data) ? body.data : []
        if (!list.length) return FALLBACK
        const ids = [...new Set(list.map((item) => Number(item.instructorId || 0)).filter((id) => id > 0))]
        const names = new Map<number, string>()
        await Promise.all(ids.map(async (id) => names.set(id, await instructorName(id))))
        return list.map((item) => fromCatalog(item, names.get(Number(item.instructorId || 0)) || 'LearnHub'))
      } catch {
        return FALLBACK
      }
    })()
  }
  return cache.then((rows) => withEdits(rows))
}

export function shopName(offer: Offer) {
  return `Shop ${offer.instructorName}`
}
