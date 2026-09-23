/** Theo dõi lượt bấm / tìm kiếm khóa học trên trình duyệt (bổ sung cho API most-viewed). */

export interface PopularCourse {
  id: number
  slug: string
  title: string
  clicks: number
  searches: number
}

/** Số khóa “thịnh hành” hiển thị sidebar + kệ sách 3D. */
export const HOT_COURSE_LIMIT = 7

const KEY = 'learnhub_course_hits_v1'

function load(): Record<number, PopularCourse> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, PopularCourse>
    const out: Record<number, PopularCourse> = {}
    Object.values(parsed).forEach((item) => {
      if (item?.id && item.slug) out[item.id] = item
    })
    return out
  } catch {
    return {}
  }
}

function save(map: Record<number, PopularCourse>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // ignore quota
  }
}

export function recordCourseClick(course: { id: number; slug: string; title: string }) {
  if (!course?.id || !course.slug) return
  const map = load()
  const cur = map[course.id] || { id: course.id, slug: course.slug, title: course.title, clicks: 0, searches: 0 }
  cur.clicks += 1
  cur.title = course.title || cur.title
  cur.slug = course.slug
  map[course.id] = cur
  save(map)
  fetch(`/api/catalog/courses/${course.id}/view`, {
    method: 'POST',
    signal: AbortSignal.timeout(2000),
  }).catch(() => {})
}

/** Kết quả tìm kiếm: mỗi khóa xuất hiện được +1 điểm tìm kiếm. */
export function recordSearchHits(courses: { id: number; slug: string; title: string }[]) {
  if (!courses?.length) return
  const map = load()
  courses.forEach((course) => {
    if (!course?.id || !course.slug) return
    const cur = map[course.id] || { id: course.id, slug: course.slug, title: course.title, clicks: 0, searches: 0 }
    cur.searches += 1
    cur.title = course.title || cur.title
    cur.slug = course.slug
    map[course.id] = cur
  })
  save(map)
}

export function localTopCourses(limit = HOT_COURSE_LIMIT): PopularCourse[] {
  return Object.values(load())
    .map((c) => ({ ...c, score: c.clicks * 3 + c.searches }))
    .sort((a, b) => (b as PopularCourse & { score: number }).score - (a as PopularCourse & { score: number }).score)
    .slice(0, limit)
    .map(({ id, slug, title, clicks, searches }) => ({ id, slug, title, clicks, searches }))
}

export type HotCourse = {
  id: number
  slug: string
  title: string
  subtitle?: string
  description?: string
  price?: number
  categoryName?: string
  level?: string
  enrollmentCount?: number
}

/** Gộp most-viewed (server) + lượt truy cập local — tối đa `limit` khóa. */
export function mergeHotList(server: HotCourse[], localPreferred: PopularCourse[], limit = HOT_COURSE_LIMIT): HotCourse[] {
  const byId = new Map<number, HotCourse>()
  server.forEach((c) => byId.set(c.id, c))
  localPreferred.forEach((c) => {
    if (!byId.has(c.id)) {
      byId.set(c.id, {
        id: c.id,
        slug: c.slug,
        title: c.title,
        subtitle: '',
        price: undefined,
        categoryName: '',
        level: '',
        enrollmentCount: 0,
      })
    } else {
      const existing = byId.get(c.id)!
      byId.set(c.id, { ...existing, title: c.title || existing.title, slug: c.slug || existing.slug })
    }
  })

  const out: HotCourse[] = []
  const seen = new Set<number>()
  for (const loc of localPreferred) {
    const c = byId.get(loc.id)
    if (!c || seen.has(c.id)) continue
    seen.add(c.id)
    out.push(c)
    if (out.length >= limit) return out
  }
  for (const c of server) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    out.push(c)
    if (out.length >= limit) break
  }
  return out
}

function asCourseList(body: unknown): HotCourse[] {
  const data = (body as { data?: HotCourse[] } | null)?.data
  return Array.isArray(data) ? data : []
}

function catalogIndex(...lists: HotCourse[][]): Map<number, HotCourse> {
  const map = new Map<number, HotCourse>()
  lists.flat().forEach((c) => {
    if (!c?.id) return
    const prev = map.get(c.id)
    map.set(c.id, prev ? { ...prev, ...c } : c)
  })
  return map
}

function enrichFromCatalog(list: HotCourse[], catalog: Map<number, HotCourse>): HotCourse[] {
  return list.map((c) => {
    const full = catalog.get(c.id)
    if (!full) return c
    return {
      ...full,
      ...c,
      title: c.title || full.title,
      slug: c.slug || full.slug,
      subtitle: c.subtitle || full.subtitle,
      categoryName: c.categoryName || full.categoryName,
      // Giá thật từ catalog — tránh stub local = 0đ
      price: Number(full.price ?? c.price ?? 0),
    }
  })
}

async function fetchJson(url: string, ms = 4000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

/** Top khóa được truy cập nhiều nhất (API most-viewed + local hits). */
export async function fetchHotCourses(limit = HOT_COURSE_LIMIT): Promise<HotCourse[]> {
  const local = localTopCourses(limit)
  const [allBody, bestBody, mostBody] = await Promise.all([
    fetchJson(`/api/catalog/courses?size=100`),
    fetchJson(`/api/catalog/best-sellers?limit=${Math.max(limit * 2, 12)}`),
    fetchJson(`/api/catalog/most-viewed?limit=${limit}`),
  ])
  const all = asCourseList(allBody).sort(
    (a, b) => Number(b.enrollmentCount || 0) - Number(a.enrollmentCount || 0),
  )
  const most = asCourseList(mostBody)
  const best = asCourseList(bestBody)
  const catalog = catalogIndex(all, best, most)
  const pool = most.length ? most : (best.length ? best : all)
  return enrichFromCatalog(mergeHotList(pool, local, limit), catalog)
}
