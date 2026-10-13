import axiosClient from '../api/axiosClient'
import { downloadExcel, downloadRows } from '../admin/adminUtils'
import { adsTaken, adLimit, favorites, ledger, orders as marketOrders, platformVouchers, seller, vouchers } from './buyerStore'
import { buyersOf } from './inbox'

export type ExportKind = 'revenue' | 'users' | 'courses' | 'payout' | 'orders' | 'coupons' | 'certificates'

const EXPORT_MARK = /\[\[EXPORT:(revenue|users|courses|payout|orders|coupons|certificates)\]\]/i

function vnd(value: unknown) {
  return Number(value || 0).toLocaleString('vi-VN') + ' đ'
}

function fold(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function dataOf<T>(result: PromiseSettledResult<{ data?: { data?: T } }>): T | null {
  if (result.status !== 'fulfilled') return null
  return (result.value.data?.data ?? null) as T
}

function lines(...rows: (string | false | null | undefined)[]) {
  return rows.filter(Boolean).join('\n')
}

export async function gatherBriefing(role?: string, userId?: number): Promise<string> {
  if (role === 'ADMIN') return adminBriefing()
  if (role === 'INSTRUCTOR') return sellerBriefing(userId)
  if (role === 'STUDENT' || role === 'ORG_ADMIN') return buyerBriefing()
  return 'Khách chưa đăng nhập. Chưa có đơn, giỏ hàng hay doanh thu trên tài khoản này.'
}

async function adminBriefing() {
  const month = currentMonth()
  const [analytics, coupons, users, courses, orderPage] = await Promise.allSettled([
    axiosClient.get('/api/commerce/admin/analytics'),
    axiosClient.get('/api/catalog/coupons'),
    axiosClient.get('/api/users/admin/stats'),
    axiosClient.get('/api/catalog/admin/stats'),
    axiosClient.get('/api/commerce/admin/orders', { params: { size: 100 } }),
  ])
  const summary = dataOf<{
    summary: {
      paidOrders: number; failedOrders: number; revenue: number; platformFee: number
      instructorEarn: number; avgOrder: number; itemsSold: number
    }
    last14Days?: { date: string; revenue: number; orders: number }[]
    topCourses?: { title: string; sold: number; revenue: number }[]
  }>(analytics)

  const couponRows = dataOf<{ code: string; discountPercent: number; maxUses: number; usedCount: number; active: boolean }[]>(coupons) || []
  const userStats = dataOf<{ totalUsers: number; students: number; instructors: number; admins: number; lockedUsers: number }>(users)
  const courseStats = dataOf<{ total: number; pending: number; published: number; enrollments: number }>(courses)
  const orders = dataOf<{ total?: number; platformFee?: number; status: string; createdAt: string; couponCode?: string }[]>(orderPage) || []
  const paidMonth = orders.filter((row) => String(row.status).toUpperCase() === 'PAID' && String(row.createdAt || '').startsWith(month))
  const monthRevenue = paidMonth.reduce((sum, row) => sum + Number(row.total || 0), 0)
  const monthFee = paidMonth.reduce((sum, row) => sum + Number(row.platformFee || 0), 0)
  const kyc = seller()
  const shop = ledger()
  const top = summary?.topCourses?.slice(0, 5).map((row) => `${row.title} (${row.sold} suất, ${vnd(row.revenue)})`).join('; ')
  return lines(
    `Vai trò: quản trị. Tháng hiện tại: ${month}.`,
    summary
      ? `Doanh thu sàn (đơn đã thanh toán): ${vnd(summary.summary.revenue)}. Phí sàn: ${vnd(summary.summary.platformFee)}. Giảng viên nhận: ${vnd(summary.summary.instructorEarn)}. Đơn thành công: ${summary.summary.paidOrders}. Đơn thất bại: ${summary.summary.failedOrders}. Khóa đã bán: ${summary.summary.itemsSold}. Đơn trung bình: ${vnd(summary.summary.avgOrder)}.`
      : 'Không lấy được doanh thu (commerce-service chưa chạy hoặc lỗi).',
    paidMonth.length
      ? `Tháng này: ${paidMonth.length} đơn đã thanh toán, doanh thu ${vnd(monthRevenue)}, lời sàn (phí) ${vnd(monthFee)}.`
      : (summary ? `Tháng này: chưa thấy đơn PAID trong 100 đơn gần nhất.` : null),
    couponRows.length
      ? `Coupon sàn: ${couponRows.length} mã. Đang hiệu lực: ${couponRows.filter((row) => row.active).length}. Chi tiết: ${couponRows.map((row) => `${row.code} ${row.discountPercent}% (${row.usedCount || 0}/${row.maxUses || 0})`).join(', ')}.`
      : 'Coupon sàn: chưa lấy được danh sách (catalog-service) hoặc chưa có mã.',
    userStats ? `Tài khoản: ${userStats.totalUsers} (học viên ${userStats.students}, giảng viên ${userStats.instructors}, admin ${userStats.admins}, đang khóa ${userStats.lockedUsers}).` : 'Không lấy được số tài khoản.',
    courseStats ? `Khóa học: ${courseStats.total} (chờ duyệt ${courseStats.pending}, đã đăng ${courseStats.published}, lượt ghi danh ${courseStats.enrollments}).` : 'Không lấy được số khóa học.',
    top ? `Khóa bán chạy: ${top}.` : null,
    `Hồ sơ nhận tiền đang lưu trên trình duyệt: ${kyc.fullName || 'trống'} · ${kyc.kyc} · ${kyc.bank} ${kyc.accountNumber}.`,
    `Dòng tiền chợ local: người mua ${vnd(shop.gross)} · phí ${vnd(shop.fee)} · trả shop ${vnd(shop.net)}.`,
    `Voucher demo local của sàn: ${platformVouchers().map((row) => `${row.code} ${row.percent}% ${row.used}/${row.max}`).join(', ') || 'không có'}.`,
    'Nếu người dùng bảo xuất Excel: thêm dòng [[EXPORT:revenue]] (doanh thu), [[EXPORT:users]] (tài khoản) hoặc [[EXPORT:courses]] (khóa học).',
  )
}

async function sellerBriefing(userId?: number) {
  const [payout, courses, coupons] = await Promise.allSettled([
    axiosClient.get('/api/commerce/instructor/payouts'),
    axiosClient.get('/api/catalog/instructor/courses'),
    axiosClient.get('/api/catalog/coupons'),
  ])
  const money = dataOf<{ gross: number; platformFee: number; net: number; orderItemCount: number }>(payout)
  const courseRows = dataOf<{ title: string; status: string; price: number; enrollmentCount?: number }[]>(courses) || []
  const couponRows = dataOf<{ code: string; discountPercent: number; maxUses: number; usedCount: number; active: boolean }[]>(coupons) || []
  const kyc = seller()
  const shop = ledger()
  const buyers = userId ? buyersOf(userId) : []
  return lines(
    'Vai trò: người bán.',
    money
      ? `Doanh thu khóa đã bán: ${vnd(money.gross)}. Phí sàn 30%: ${vnd(money.platformFee)}. Thực lĩnh: ${vnd(money.net)}. Số suất bán: ${money.orderItemCount}.`
      : 'Không lấy được doanh thu giảng viên (commerce-service chưa chạy).',
    courseRows.length
      ? `Khóa của bạn: ${courseRows.length}. ${courseRows.slice(0, 8).map((row) => `${row.title} (${row.status}, ${vnd(row.price)})`).join('; ')}.`
      : 'Chưa lấy được danh sách khóa Studio.',
    couponRows.length
      ? `Voucher shop: ${couponRows.length} mã. ${couponRows.map((row) => `${row.code} ${row.discountPercent}% ${row.usedCount || 0}/${row.maxUses || 0}`).join(', ')}.`
      : 'Chưa có voucher shop hoặc catalog chưa chạy.',
    `Hồ sơ nhận tiền: ${kyc.kyc}. ${kyc.bank} ${kyc.accountNumber} ${kyc.accountName}.`,
    `Quảng cáo: đã dùng ${adsTaken()}/${adLimit()} suất.`,
    `Người mua đã nhắn: ${buyers.length}.`,
    `Voucher local: ${vouchers().map((row) => `${row.code} ${row.percent}%`).join(', ') || 'không có'}. Dòng tiền chợ local: thực lĩnh ${vnd(shop.net)}.`,
    'Nếu bảo xuất Excel: [[EXPORT:payout]] doanh thu, [[EXPORT:courses]] khóa, [[EXPORT:coupons]] voucher.',
  )
}

async function buyerBriefing() {
  const [cart, orders, courses, certs] = await Promise.allSettled([
    axiosClient.get('/api/commerce/cart'),
    axiosClient.get('/api/commerce/orders', { params: { size: 20 } }),
    axiosClient.get('/api/learning/my-courses'),
    axiosClient.get('/api/learning/certificates'),
  ])
  const bag = dataOf<{ items?: { title: string; price: number }[]; total?: number }>(cart)
  const orderRows = dataOf<{ id: number; status: string; total: number; couponCode?: string }[]>(orders) || []
  const courseRows = dataOf<{ courseTitle: string; progressPercent: number }[]>(courses) || []
  const certRows = dataOf<{ courseTitle?: string; code?: string }[]>(certs) || []
  const fav = favorites()
  const local = marketOrders()
  return lines(
    'Vai trò: người mua.',
    bag
      ? `Giỏ hàng: ${bag.items?.length || 0} khóa, tạm tính ${vnd(bag.total)}. ${ (bag.items || []).map((row) => row.title).join(', ') || 'trống' }.`
      : 'Không lấy được giỏ hàng (commerce-service chưa chạy).',
    orderRows.length
      ? `Đơn mua: ${orderRows.length} đơn gần đây. ${orderRows.map((row) => `#${row.id} ${row.status} ${vnd(row.total)}${row.couponCode ? ' ' + row.couponCode : ''}`).join('; ')}.`
      : 'Chưa có đơn trên hệ thống hoặc commerce chưa chạy.',
    courseRows.length
      ? `Khóa đang học: ${courseRows.length}. ${courseRows.map((row) => `${row.courseTitle} ${row.progressPercent || 0}%`).join('; ')}.`
      : 'Chưa có khóa trong Khóa học của tôi.',
    `Chứng chỉ: ${certRows.length}.`,
    `Yêu thích local: ${fav.length} khóa.`,
    local.length ? `Đơn chợ local: ${local.length}.` : null,
    'Mã demo sàn LEARNHUB20 giảm 20% ở giỏ hàng.',
    'Nếu bảo xuất Excel: [[EXPORT:orders]] đơn, [[EXPORT:courses]] khóa đang học, [[EXPORT:certificates]] chứng chỉ.',
  )
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function stripExport(answer: string) {
  const match = answer.match(EXPORT_MARK)
  return {
    text: answer.replace(EXPORT_MARK, '').replace(/\n{3,}/g, '\n\n').trim(),
    exportKind: match ? match[1].toLowerCase() as ExportKind : null,
  }
}

export function exportFromQuestion(question: string, role?: string): ExportKind | null {
  const q = fold(question)
  const wants = /excel|xlsx|xuat file|tai file|xuat bao cao|download|gui file/.test(q)
  if (!wants) return null
  if (role === 'ADMIN') {
    if (/tai khoan|user|nguoi dung/.test(q)) return 'users'
    if (/khoa hoc|course/.test(q) && !/doanh thu|ban chay/.test(q)) return 'courses'
    return 'revenue'
  }
  if (role === 'INSTRUCTOR') {
    if (/voucher|coupon|ma giam/.test(q)) return 'coupons'
    if (/khoa/.test(q) && !/doanh thu|tien/.test(q)) return 'courses'
    return 'payout'
  }
  if (/chung chi|certificate/.test(q)) return 'certificates'
  if (/khoa/.test(q) && !/don/.test(q)) return 'courses'
  return 'orders'
}

export async function runExport(kind: ExportKind): Promise<string> {
  if (kind === 'revenue') {
    await downloadExcel('/api/commerce/admin/export', 'learnhub-doanh-thu.xlsx')
    return 'Đã tải file Excel doanh thu (learnhub-doanh-thu.xlsx).'
  }
  if (kind === 'users') {
    try {
      await downloadExcel('/api/users/admin/export', 'learnhub-tai-khoan.xlsx')
    } catch {
      const users = await allPages('/api/users')
      downloadRows('learnhub-tai-khoan.xls', 'Tai khoan',
        ['ID', 'Ten dang nhap', 'Email', 'Ho ten', 'Vai tro', 'Khoa'],
        users.map((user) => [
          Number(user.id || 0),
          String(user.username || ''),
          String(user.email || ''),
          String(user.fullName || ''),
          String(user.role || ''),
          user.locked ? 'Khoa' : 'Hoat dong',
        ]))
    }
    return 'Đã tải file Excel tài khoản.'
  }
  if (kind === 'courses') {
    try {
      await downloadExcel('/api/catalog/admin/export', 'learnhub-khoa-hoc.xlsx')
      return 'Đã tải file Excel khóa học.'
    } catch {
      const mine = await axiosClient.get('/api/learning/my-courses').then((res) => res.data.data || []).catch(() => [])
      const studio = await axiosClient.get('/api/catalog/instructor/courses').then((res) => res.data.data || []).catch(() => [])
      const rows = (studio.length ? studio : mine) as Record<string, unknown>[]
      downloadRows('learnhub-khoa-hoc.xls', 'Khoa hoc',
        ['Tieu de', 'Trang thai / tien do', 'Gia'],
        rows.map((row) => [
          String(row.title || row.courseTitle || ''),
          String(row.status || `${row.progressPercent || 0}%`),
          Number(row.price || 0),
        ]))
      return 'Đã tải file Excel khóa học.'
    }
  }
  if (kind === 'payout') {
    const d = (await axiosClient.get('/api/commerce/instructor/payouts')).data.data
    downloadRows('learnhub-doanh-thu-giang-vien.xls', 'Doanh thu',
      ['Chi so', 'Gia tri'],
      [
        ['Doanh thu', Number(d.gross || 0)],
        ['Phi san', Number(d.platformFee || 0)],
        ['Thuc linh', Number(d.net || 0)],
        ['So suat ban', Number(d.orderItemCount || 0)],
      ])
    return 'Đã tải file Excel doanh thu giảng viên.'
  }
  if (kind === 'coupons') {
    const rows = (await axiosClient.get('/api/catalog/coupons')).data.data || []
    downloadRows('learnhub-voucher.xls', 'Voucher',
      ['Ma', 'Phan tram', 'Da dung', 'Toi da', 'Hieu luc'],
      rows.map((row: { code: string; discountPercent: number; usedCount: number; maxUses: number; active: boolean }) => [
        row.code, row.discountPercent, row.usedCount || 0, row.maxUses || 0, row.active ? 'co' : 'khong',
      ]))
    return 'Đã tải file Excel voucher.'
  }
  if (kind === 'certificates') {
    const rows = (await axiosClient.get('/api/learning/certificates')).data.data || []
    downloadRows('learnhub-chung-chi.xls', 'Chung chi',
      ['Khoa hoc', 'Ma'],
      rows.map((row: { courseTitle?: string; code?: string }) => [String(row.courseTitle || ''), String(row.code || '')]))
    return 'Đã tải file Excel chứng chỉ.'
  }
  const rows = (await axiosClient.get('/api/commerce/orders', { params: { size: 50 } })).data.data || []
  downloadRows('learnhub-don-mua.xls', 'Don mua',
    ['ID', 'Trang thai', 'Tong', 'Ma giam'],
    rows.map((row: { id: number; status: string; total: number; couponCode?: string }) => [
      row.id, row.status, Number(row.total || 0), String(row.couponCode || ''),
    ]))
  return 'Đã tải file Excel đơn mua.'
}

async function allPages(url: string) {
  const rows: Record<string, unknown>[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const res = await axiosClient.get(url, { params: { page, size: 100 } })
    rows.push(...(res.data.data || []))
    totalPages = Number(res.data.meta?.totalPages || 1)
    page += 1
  }
  return rows
}

export const NAV_MARK = /\[\[NAV:(\/[a-zA-Z0-9\-_/]*)\]\]/i

export function stripNav(text: string) {
  const match = text.match(NAV_MARK)
  return {
    text: text.replace(NAV_MARK, '').replace(/\n{3,}/g, '\n\n').trim(),
    navPath: match ? match[1] : null,
  }
}

export function labelForNav(path: string, vi = true): string {
  switch (path) {
    case '/admin': return vi ? 'Tổng quan' : 'Overview'
    case '/admin/courses': return vi ? 'Duyệt khóa học' : 'Review Courses'
    case '/admin/users': return vi ? 'Quản lý tài khoản' : 'Manage Accounts'
    case '/admin/revenue': return vi ? 'Doanh thu sàn' : 'Platform Revenue'
    case '/admin/analytics': return vi ? 'Phân tích' : 'Analytics'
    case '/admin/coupons': return vi ? 'Coupon sàn' : 'Platform Coupons'
    case '/admin/business': return vi ? 'Gói Business' : 'Business Plans'
    case '/admin/reports': return vi ? 'Báo cáo Excel' : 'Excel Reports'
    case '/admin/desk': return vi ? 'Bàn vận hành & KYC' : 'Operations Desk & KYC'
    case '/': return vi ? 'Trang chủ học viên' : 'Learner Home'
    default: return vi ? 'Chức năng' : 'Feature'
  }
}

export function detectAdminNav(question: string, role?: string, vi = true): { path: string; label: string; text: string } | null {
  if (role !== 'ADMIN') return null
  const q = fold(question)
  const isCommand = /mo|vao|chuyen|bat|xem|di den|open|goto|navigate|link|truy cap|den muc/.test(q)

  if (/tai khoan|user|nguoi dung|hoc vien|giang vien|khoa tai khoan|mo khoa/.test(q)) {
    return {
      path: '/admin/users',
      label: vi ? 'Quản lý tài khoản' : 'Manage Accounts',
      text: vi
        ? 'Đã tự động mở chức năng Quản lý tài khoản (/admin/users) cho bạn.'
        : 'Navigating to Manage Accounts (/admin/users)...',
    }
  }
  if (/duyet khoa|khoa cho duyet|xet duyet|khoa hoc|courses/.test(q) && !/doanh thu|ban chay/.test(q)) {
    return {
      path: '/admin/courses',
      label: vi ? 'Duyệt khóa học' : 'Review Courses',
      text: vi
        ? 'Đã tự động mở chức năng Duyệt khóa học (/admin/courses) cho bạn.'
        : 'Navigating to Review Courses (/admin/courses)...',
    }
  }
  if ((/doanh thu|revenue|tai chinh|thu nhap|tien san/.test(q) && isCommand) || /trang doanh thu|muc doanh thu/.test(q)) {
    return {
      path: '/admin/revenue',
      label: vi ? 'Doanh thu sàn' : 'Platform Revenue',
      text: vi
        ? 'Đã tự động mở chức năng Doanh thu sàn (/admin/revenue) cho bạn.'
        : 'Navigating to Platform Revenue (/admin/revenue)...',
    }
  }
  if (/phan tich|analytics|bieu do|thong ke|chart/.test(q)) {
    return {
      path: '/admin/analytics',
      label: vi ? 'Phân tích' : 'Analytics',
      text: vi
        ? 'Đã tự động mở chức năng Phân tích số liệu (/admin/analytics) cho bạn.'
        : 'Navigating to Analytics (/admin/analytics)...',
    }
  }
  if ((/coupon|voucher|ma giam|khuyen mai/.test(q) && isCommand) || /trang coupon|muc coupon/.test(q)) {
    return {
      path: '/admin/coupons',
      label: vi ? 'Coupon sàn' : 'Platform Coupons',
      text: vi
        ? 'Đã tự động mở chức năng Coupon sàn (/admin/coupons) cho bạn.'
        : 'Navigating to Platform Coupons (/admin/coupons)...',
    }
  }
  if (/business|doanh nghiep|to chuc|b2b/.test(q)) {
    return {
      path: '/admin/business',
      label: vi ? 'Gói Business' : 'Business Plans',
      text: vi
        ? 'Đã tự động mở chức năng Gói Business (/admin/business) cho bạn.'
        : 'Navigating to Business Plans (/admin/business)...',
    }
  }
  if ((/bao cao|reports/.test(q) && isCommand) || /trang bao cao|trang reports/.test(q)) {
    return {
      path: '/admin/reports',
      label: vi ? 'Báo cáo Excel' : 'Excel Reports',
      text: vi
        ? 'Đã tự động mở chức năng Báo cáo Excel (/admin/reports) cho bạn.'
        : 'Navigating to Excel Reports (/admin/reports)...',
    }
  }
  if (/van hanh|desk|kyc|ho so|xac minh|rut tien|payout/.test(q)) {
    return {
      path: '/admin/desk',
      label: vi ? 'Bàn vận hành & KYC' : 'Operations Desk & KYC',
      text: vi
        ? 'Đã tự động mở chức năng Bàn vận hành & Duyệt KYC (/admin/desk) cho bạn.'
        : 'Navigating to Operations Desk & KYC (/admin/desk)...',
    }
  }
  if (/tong quan|dashboard|overview|trang chu admin|bang dieu khien/.test(q)) {
    return {
      path: '/admin',
      label: vi ? 'Tổng quan' : 'Overview',
      text: vi
        ? 'Đã tự động chuyển về trang Tổng quan quản trị (/admin) cho bạn.'
        : 'Navigating to Admin Overview (/admin)...',
    }
  }
  if (/trang hoc vien|trang chu|trang mua|learner/.test(q) && isCommand) {
    return {
      path: '/',
      label: vi ? 'Trang chủ học viên' : 'Learner Home',
      text: vi
        ? 'Đã tự động chuyển về Trang chủ học viên cho bạn.'
        : 'Navigating to Learner Home...',
    }
  }
  return null
}

export function isMcpRestricted(question: string): boolean {
  const q = fold(question)
  const systemKeywords = /he thong|system|backend|server|may chu|microservice|kien truc|architecture|docker|kubernetes|nginx|port|cong ket noi|ma nguon|source code|cau hinh|config|env|secret|internal key|jwt/
  const dbKeywords = /co so du lieu|database|csdl|\bdb\b|sql|mysql|aiven|table|bang du lieu|schema|query|flyway|ket noi db/
  const userKeywords = /thong tin user|danh sach user|mat khau|password|hash|email nguoi dung|sdt|phone|cccd|thong tin kyc|admin account|tai khoan admin|tai khoan nguoi khac/
  const exploitKeywords = /hack|bypass|exploit|phan quyen admin|trao quyen admin|dump data/

  return systemKeywords.test(q) || dbKeywords.test(q) || userKeywords.test(q) || exploitKeywords.test(q)
}

export function isProductQuestion(question: string): boolean {
  const q = fold(question)
  return /san pham|khoa hoc|lap trinh|tieng anh|ngoai ngu|thiet ke|tin hoc|excel|marketing|goi y|tu van|muon hoc|nen hoc|co khoa nao|gia bao nhieu|de xuat|course|product|ban chay/.test(q)
}

export function consultProducts(question: string, vi = true): string {
  const q = fold(question)
  if (/lap trinh|developer|coding|java|spring|react|python|web/.test(q)) {
    return vi
      ? `Chào bạn! Về mảng Lập trình, LearnHub xin tư vấn các sản phẩm khóa học chất lượng hàng đầu:\n\n1. Java cơ bản cho người mới (Giảng viên: Mai Lan) - 499.000 đ [Cơ bản]\n→ Khóa nhập môn toàn diện: cú pháp, vòng lặp, hướng đối tượng (OOP) và bài tập thực hành cuối mỗi chương.\n\n2. Spring Boot thực hành chuyên sâu (Giảng viên: Trần Khoa) - 890.000 đ [Nâng cao]\n→ Xây dựng RESTful API, Spring Security, phân quyền người dùng và kết nối cơ sở dữ liệu doanh nghiệp.\n\n3. SQL truy vấn dữ liệu (Giảng viên: Lê Hà) - 540.000 đ [Trung cấp]\n→ Thành thạo SELECT, JOIN, nhóm và tối ưu hóa xử lý bảng dữ liệu thực tế.\n\nBạn đang muốn bắt đầu từ con số 0 hay nâng cao để đi làm, hãy chia sẻ để mình tư vấn chi tiết nhé!`
      : `Top programming courses:\n1. Java Basics for Beginners (499,000 VND)\n2. Practical Spring Boot (890,000 VND)\n3. SQL Data Queries (540,000 VND)\nWhat is your current level and goal?`
  }
  if (/tieng anh|ngoai ngu|ielts|giao tiep|toeic|english/.test(q)) {
    return vi
      ? `Chào bạn! Về mảng Ngoại ngữ & Kỹ năng giao tiếp, LearnHub xin gợi ý:\n\n1. IELTS Writing 6.5 (Giảng viên: Trần Khoa) - 790.000 đ [Trung cấp]\n→ Luyện dàn ý Task 1 & Task 2, bộ từ vựng học thuật theo chủ đề và chữa bài viết mẫu chi tiết.\n\n2. Thuyết trình tự tin (Giảng viên: Lê Hà) - 420.000 đ [Trung cấp]\n→ Luyện mở bài thu hút, giữ nhịp tương tác và tự tin nói trước lớp hay đám đông.\n\nBạn đang ôn luyện thi chứng chỉ hay muốn cải thiện giao tiếp công sở?`
      : `Top language courses:\n1. IELTS Writing 6.5 (790,000 VND)\n2. Confident Presentations (420,000 VND)`
  }
  if (/thiet ke|design|ui|ux|figma|do hoa/.test(q)) {
    return vi
      ? `Chào bạn! Về lĩnh vực Thiết kế & UI/UX, sản phẩm nổi bật nhất gồm:\n\n1. Thiết kế giao diện căn bản (Giảng viên: Lê Hà) - 650.000 đ [Cơ bản]\n→ Nắm vững bố cục, màu sắc, typography và thực hành làm Landing Page hoàn chỉnh cho sản phẩm số.\n\n2. Marketing cho khóa học (Giảng viên: Trần Khoa) - 610.000 đ [Cơ bản]\n→ Viết nội dung và thiết kế ấn phẩm truyền thông quảng cáo.\n\nKhóa học có bài tập thực chiến và giảng viên phản hồi trực tiếp.`
      : `Top design courses:\n1. UI/UX Interface Design Basics (650,000 VND)`
  }
  if (/tin hoc|excel|van phong|office/.test(q)) {
    return vi
      ? `Chào bạn! Về Tin học văn phòng & Dữ liệu thực chiến:\n\n1. Excel cho công việc (Giảng viên: Mai Lan) - 350.000 đ [Cơ bản]\n→ Hàm tính toán thông dụng, bảng PivotTable, vẽ biểu đồ và tự động hóa báo cáo doanh thu.\n\n2. SQL truy vấn dữ liệu (Giảng viên: Lê Hà) - 540.000 đ [Trung cấp]\n→ Phân tích dữ liệu học viên, đơn hàng và báo cáo thống kê.\n\nNhập mã LEARNHUB20 ở giỏ hàng để được giảm ngay 20% khi đăng ký bạn nhé!`
      : `Top office courses:\n1. Excel for Work (350,000 VND)\n2. SQL Data Queries (540,000 VND)`
  }

  return vi
    ? `Dạ chào bạn! LearnHub hiện có các nhóm sản phẩm khóa học chất lượng cao được đánh giá tốt nhất:\n\n📌 1. Lập trình & Công nghệ:\n- Java cơ bản cho người mới (499.000 đ, Mai Lan)\n- Spring Boot thực hành (890.000 đ, Trần Khoa)\n- SQL truy vấn dữ liệu (540.000 đ, Lê Hà)\n\n📌 2. Ngoại ngữ & Giao tiếp:\n- IELTS Writing 6.5 (790.000 đ, Trần Khoa)\n- Thuyết trình tự tin (420.000 đ, Lê Hà)\n\n📌 3. Thiết kế & Tin học văn phòng:\n- Thiết kế giao diện UI/UX căn bản (650.000 đ, Lê Hà)\n- Excel cho công việc (350.000 đ, Mai Lan)\n\n🎁 Ưu đãi độc quyền: Bạn có thể nhập mã LEARNHUB20 tại giỏ hàng để nhận ngay giảm giá 20%!\nBạn đang quan tâm đến lĩnh vực nào để mình tư vấn lộ trình học phù hợp nhất nhé?`
    : `Welcome! LearnHub offers top courses in Programming (Java, Spring Boot), English (IELTS Writing), UI/UX Design, and Excel. Use promo code LEARNHUB20 for 20% off. Which subject are you interested in?`
}

export function isDataQuestion(question: string) {
  const q = fold(question)
  return /doanh thu|coupon|voucher|ma giam|loi|thuc linh|phi san|don|ban duoc|gio hang|chung chi|bao cao|excel|xlsx|cho duyet|kyc|ho so|suat|tien/.test(q)
}

function looksLikeDirections(text: string) {
  const q = fold(text)
  return /ban vao|chon muc|cong quan tri|hay vao|muc doanh thu|trang bao cao|nhan nut xuat/.test(q)
}

export function pickAnswer(aiText: string, question: string, briefing: string, role?: string, vi = true) {
  // 1. Kiem tra MCP Guardrail cho nguoi dung khong phai Admin
  if (role !== 'ADMIN' && isMcpRestricted(question)) {
    return {
      text: vi
        ? 'Tôi không có đủ thẩm quyền để trả lời câu hỏi này theo quy định an toàn hệ thống (MCP Policy). Tôi chỉ có thể hỗ trợ tư vấn các sản phẩm khóa học và giải đáp thông tin học tập trên LearnHub.'
        : 'I do not have authorization to answer this question per MCP security policies.',
      exportKind: null,
    }
  }

  // 2. Kiem tra lenh dieu huong Admin
  if (role === 'ADMIN') {
    const nav = detectAdminNav(question, role, vi)
    if (nav) {
      return { text: `${nav.text}\n[[NAV:${nav.path}]]`, exportKind: null }
    }
  }

  // 3. Kiem tra cau hoi san pham
  if (isProductQuestion(question)) {
    return { text: consultProducts(question, vi), exportKind: null }
  }

  const parsed = stripExport(aiText)
  if (!isDataQuestion(question)) return parsed
  const hasNumber = /\d/.test(parsed.text)
  if (hasNumber && !looksLikeDirections(parsed.text)) return parsed
  return { text: localAnswer(question, briefing, role, vi), exportKind: parsed.exportKind }
}

export function localAnswer(question: string, briefing: string, role?: string, vi = true) {
  // 1. Kiem tra MCP Guardrail cho nguoi dung thong thuong
  if (role !== 'ADMIN' && isMcpRestricted(question)) {
    return vi
      ? 'Tôi không có đủ thẩm quyền để trả lời câu hỏi này theo quy định an toàn hệ thống (MCP Policy). Tôi chỉ có thể hỗ trợ tư vấn các sản phẩm khóa học và giải đáp thông tin học tập trên LearnHub.'
      : 'I do not have authorization to answer this question per MCP security policies.'
  }

  // 2. Kiem tra lenh dieu huong Admin
  if (role === 'ADMIN') {
    const nav = detectAdminNav(question, role, vi)
    if (nav) {
      return `${nav.text}\n[[NAV:${nav.path}]]`
    }
  }

  // 3. Kiem tra tu van san pham
  if (isProductQuestion(question)) {
    return consultProducts(question, vi)
  }

  // 4. Tra cuu so lieu he thong
  const dataAsk = isDataQuestion(question)
  if (dataAsk && briefing) {
    return vi
      ? `Số liệu lấy lúc bạn hỏi:\n${briefing.replace(/Nếu người dùng[\s\S]*$/, '').replace(/Nếu bảo xuất[\s\S]*$/, '').trim()}`
      : `Live figures from this moment:\n${briefing}`
  }

  if (role === 'ADMIN') {
    return vi
      ? 'Bạn đang dùng AI quản trị. Ra lệnh "mở [chức năng]" (tài khoản, duyệt khóa, doanh thu, kyc, coupon, báo cáo...) để AI tự động chuyển trang. Hoặc hỏi doanh thu, coupon, bảo xuất Excel.'
      : 'Admin AI. Say "open [feature]" to auto-navigate, or ask for revenue, coupons, and Excel exports.'
  }
  if (role === 'INSTRUCTOR') {
    return vi
      ? 'Hãy hỏi doanh thu, thực lĩnh, voucher, hồ sơ nhận tiền, người mua đã nhắn, hoặc bảo xuất Excel.'
      : 'Ask for payout, vouchers, KYC, buyers who messaged you, or an Excel export.'
  }
  return vi
    ? 'Chào bạn! Mình là AI trợ lý của LearnHub. Bạn có thể hỏi mình tư vấn các sản phẩm khóa học, lộ trình học tập, xem giỏ hàng hoặc chính sách hoàn tiền.'
    : 'Welcome! I am LearnHub AI Assistant. Ask me about course products, learning paths, your cart, or refund policies.'
}

