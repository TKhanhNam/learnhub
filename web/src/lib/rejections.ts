const KEY = 'lh-course-rejections'

export interface CourseRejection {
  courseId: number
  courseTitle: string
  reason: string
  rejectedAt: string
  rejectedBy?: string
}

export function saveRejection(courseId: number, courseTitle: string, reason: string, adminName = 'Admin') {
  try {
    const raw = localStorage.getItem(KEY)
    const list: CourseRejection[] = raw ? JSON.parse(raw) : []
    const existing = list.findIndex((r) => r.courseId === courseId)
    const item: CourseRejection = {
      courseId,
      courseTitle,
      reason,
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminName,
    }
    if (existing >= 0) {
      list[existing] = item
    } else {
      list.unshift(item)
    }
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}

export function getRejection(courseId: number): CourseRejection | null {
  try {
    const raw = localStorage.getItem(KEY)
    const list: CourseRejection[] = raw ? JSON.parse(raw) : []
    return list.find((r) => r.courseId === courseId) || null
  } catch {
    return null
  }
}

export function removeRejection(courseId: number) {
  try {
    const raw = localStorage.getItem(KEY)
    const list: CourseRejection[] = raw ? JSON.parse(raw) : []
    const filtered = list.filter((r) => r.courseId !== courseId)
    localStorage.setItem(KEY, JSON.stringify(filtered))
  } catch {}
}
