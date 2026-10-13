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

export function isDataQuestion(question: string) {
  const q = fold(question)
  return /doanh thu|coupon|voucher|ma giam|loi|thuc linh|phi san|don|ban duoc|khoa hoc|gio hang|chung chi|bao cao|excel|xlsx|tai khoan|cho duyet|kyc|ho so|suat|tien/.test(q)
}

function looksLikeDirections(text: string) {
  const q = fold(text)
  return /ban vao|chon muc|cong quan tri|hay vao|muc doanh thu|trang bao cao|nhan nut xuat/.test(q)
}

export function pickAnswer(aiText: string, question: string, briefing: string, role?: string, vi = true) {
  const parsed = stripExport(aiText)
  if (!isDataQuestion(question)) return parsed
  const hasNumber = /\d/.test(parsed.text)
  if (hasNumber && !looksLikeDirections(parsed.text)) return parsed
  return { text: localAnswer(question, briefing, role, vi), exportKind: parsed.exportKind }
}

export function localAnswer(question: string, briefing: string, role?: string, vi = true) {
  const q = fold(question)
  const dataAsk = isDataQuestion(question)
  if (dataAsk && briefing) {
    return vi
      ? `Số liệu lấy lúc bạn hỏi:\n${briefing.replace(/Nếu người dùng[\s\S]*$/, '').replace(/Nếu bảo xuất[\s\S]*$/, '').trim()}`
      : `Live figures from this moment:\n${briefing}`
  }
  if (role === 'ADMIN') {
    return vi
      ? 'Hãy hỏi doanh thu, coupon, đơn tháng này, khóa chờ duyệt, tài khoản đang khóa, hoặc bảo xuất Excel.'
      : 'Ask for revenue, coupons, this month’s orders, pending courses, locked accounts, or an Excel export.'
  }
  if (role === 'INSTRUCTOR') {
    return vi
      ? 'Hãy hỏi doanh thu, thực lĩnh, voucher, hồ sơ nhận tiền, người mua đã nhắn, hoặc bảo xuất Excel.'
      : 'Ask for payout, vouchers, KYC, buyers who messaged you, or an Excel export.'
  }
  return vi
    ? 'Hãy hỏi giỏ hàng, đơn mua, khóa đang học, chứng chỉ, hoặc bảo xuất Excel danh sách đó.'
    : 'Ask about your cart, orders, courses, certificates, or an Excel export.'
}
