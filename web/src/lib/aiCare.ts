import axiosClient from '../api/axiosClient'
import { downloadExcel, downloadRows, downloadWorkbook } from '../admin/adminUtils'
import { adsTaken, adLimit, favorites, ledger, orders as marketOrders, platformVouchers, seller, vouchers } from './buyerStore'
import { buyersOf } from './inbox'

export type ExportKind =
  | 'admin_report'
  | 'admin_revenue'
  | 'admin_users'
  | 'admin_courses'
  | 'instructor_report'
  | 'instructor_payout'
  | 'instructor_courses'
  | 'instructor_coupons'
  | 'revenue'
  | 'users'
  | 'courses'
  | 'payout'
  | 'coupons'

const EXPORT_MARK = /\[\[EXPORT:(admin_report|admin_revenue|admin_users|admin_courses|instructor_report|instructor_payout|instructor_courses|instructor_coupons|revenue|users|courses|payout|coupons)\]\]/i

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
    'Nếu người dùng bảo xuất Excel: thêm dòng [[EXPORT:admin_report]] (báo cáo quản trị tổng hợp sàn), hoặc [[EXPORT:revenue]] (doanh thu sàn), [[EXPORT:users]] (tài khoản hệ thống), [[EXPORT:courses]] (danh mục khóa học toàn sàn). File Excel quản trị độc quyền cho Admin.',
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
    'Nếu bảo xuất Excel: thêm dòng [[EXPORT:instructor_report]] (báo cáo thu nhập & studio giảng viên), hoặc [[EXPORT:payout]] (thực lĩnh), [[EXPORT:courses]] (khóa học của tôi), [[EXPORT:coupons]] (voucher shop). File Excel thu nhập độc quyền cho Giảng viên.',
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
    'QUY ĐỊNH AN TOÀN: Học viên KHÔNG ĐƯỢC xuất file Excel. Nếu học viên yêu cầu xuất Excel, từ chối rõ ràng và giải thích tính năng xuất báo cáo Excel chỉ dành riêng cho Giảng viên và Quản trị viên hệ thống.',
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

export function isExcelRequest(question: string): boolean {
  const q = fold(question)
  return /excel|xlsx|xuat file|tai file|xuat bao cao|download file|tai xuong file|xuat excel/.test(q)
}

export function exportFromQuestion(question: string, role?: string): ExportKind | null {
  const q = fold(question)
  const wants = /excel|xlsx|xuat file|tai file|xuat bao cao|download|gui file/.test(q)
  if (!wants) return null

  // CHỈ ADMIN VÀ INSTRUCTOR ĐƯỢC XUẤT EXCEL
  if (role === 'ADMIN') {
    if (/tai khoan|user|nguoi dung/.test(q)) return 'users'
    if (/khoa hoc|course|kiem duyet/.test(q) && !/doanh thu|ban chay/.test(q)) return 'courses'
    if (/doanh thu|revenue|tai chinh|tien/.test(q)) return 'revenue'
    return 'admin_report'
  }

  if (role === 'INSTRUCTOR') {
    if (/voucher|coupon|ma giam/.test(q)) return 'coupons'
    if (/khoa hoc|khoa|course/.test(q) && !/doanh thu|tien|thu nhap/.test(q)) return 'courses'
    if (/thu nhap|thuc linh|payout|doanh thu|tien/.test(q)) return 'payout'
    return 'instructor_report'
  }

  // Học viên (STUDENT, ORG_ADMIN, GUEST...) KHÔNG ĐƯỢC XUẤT EXCEL
  return null
}

async function runAdminReport(): Promise<string> {
  const month = currentMonth()
  const [analyticsRes, usersRes, coursesRes, orderPageRes, userStatsRes, courseStatsRes] = await Promise.allSettled([
    axiosClient.get('/api/commerce/admin/analytics'),
    allPages('/api/users'),
    axiosClient.get('/api/catalog/courses', { params: { size: 100 } }),
    axiosClient.get('/api/commerce/admin/orders', { params: { size: 100 } }),
    axiosClient.get('/api/users/admin/stats'),
    axiosClient.get('/api/catalog/admin/stats'),
  ])

  const analytics = analyticsRes.status === 'fulfilled' ? (analyticsRes.value.data?.data as Record<string, unknown>) : null
  const summary = (analytics?.summary as Record<string, unknown>) || {}
  const users = usersRes.status === 'fulfilled' ? (usersRes.value as Record<string, unknown>[]) : []
  const catalogCourses = coursesRes.status === 'fulfilled' ? ((coursesRes.value.data?.data || []) as Record<string, unknown>[]) : []
  const orders = orderPageRes.status === 'fulfilled' ? ((orderPageRes.value.data?.data || []) as Record<string, unknown>[]) : []
  const userStats = userStatsRes.status === 'fulfilled' ? (userStatsRes.value.data?.data as Record<string, unknown>) : null
  const courseStats = courseStatsRes.status === 'fulfilled' ? (courseStatsRes.value.data?.data as Record<string, unknown>) : null

  // Sheet 1: TaiChinh_ToanSan
  const finRows: (string | number)[][] = [
    ['Tong doanh thu toan san (Gross)', Number(summary?.revenue || 0), 'VND (Tong cac don hang thanh cong PAID)'],
    ['Phi hoa hong san (30% Loi nhuan)', Number(summary?.platformFee || 0), 'VND (Doanh thu rong giu lai cho san)'],
    ['Chi tra cho toan bo giang vien (70%)', Number(summary?.instructorEarn || 0), 'VND (Phan bo cho cac giang vien)'],
    ['So don hang thanh cong (PAID)', Number(summary?.paidOrders || 0), 'Don hang'],
    ['So don hang that bai / huy', Number(summary?.failedOrders || 0), 'Don hang'],
    ['Gia tri don hang trung binh (AOV)', Number(summary?.avgOrder || 0), 'VND/don'],
    ['Tong so luot khoa hoc da ban', Number(summary?.itemsSold || 0), 'Luot'],
    ['Thang bao cao', month, 'Thoi diem'],
  ]
  if (orders.length > 0) {
    finRows.push(['', '', ''])
    finRows.push(['--- DANH SACH DON HANG SAN GAN DAY ---', '', ''])
    orders.slice(0, 30).forEach((ord) => {
      finRows.push([`Don #${ord.id} (${ord.status})`, Number(ord.total || 0), `Phi san: ${Number(ord.platformFee || 0)}`])
    })
  }

  // Sheet 2: NguoiDung_HeThong
  const userRows: (string | number)[][] = [
    ['Thong ke nguoi dung he thong', '', '', '', '', ''],
    ['Tong so tai khoan', Number(userStats?.totalUsers || users.length), '', '', '', ''],
    ['Hoc vien (STUDENT)', Number(userStats?.students || 0), '', '', '', ''],
    ['Giang vien (INSTRUCTOR)', Number(userStats?.instructors || 0), '', '', '', ''],
    ['Quan tri vien (ADMIN)', Number(userStats?.admins || 0), '', '', '', ''],
    ['Tai khoan dang bi khoa', Number(userStats?.lockedUsers || 0), '', '', '', ''],
    ['', '', '', '', '', ''],
    ['ID', 'Ten dang nhap', 'Email', 'Ho ten', 'Vai tro', 'Trang thai'],
    ...users.map((u) => [
      Number(u.id || 0),
      String(u.username || ''),
      String(u.email || ''),
      String(u.fullName || ''),
      String(u.role || ''),
      u.locked ? 'Khoa' : 'Hoat dong',
    ]),
  ]

  // Sheet 3: KhoaHoc_KiemDuyet
  const courseRows: (string | number)[][] = [
    ['Thong ke khoa hoc toan san', '', '', '', ''],
    ['Tong so khoa hoc', Number(courseStats?.total || catalogCourses.length), '', '', ''],
    ['Khoa hoc cho xet duyet (PENDING)', Number(courseStats?.pending || 0), '', '', ''],
    ['Khoa hoc da xuat ban (PUBLISHED)', Number(courseStats?.published || 0), '', '', ''],
    ['Tong luot hoc vien ghi danh', Number(courseStats?.enrollments || 0), '', '', ''],
    ['', '', '', '', ''],
    ['ID', 'Tieu de khoa hoc', 'Gia niem yet', 'Trang thai duyet', 'Hoc vien'],
    ...catalogCourses.map((c) => [
      Number(c.id || 0),
      String(c.title || ''),
      Number(c.price || 0),
      String(c.status || ''),
      Number(c.enrollmentCount || 0),
    ]),
  ]

  downloadWorkbook('learnhub-admin-quan-tri.xls', [
    { sheet: 'TaiChinh_ToanSan', headers: ['Chi so tai chinh san', 'Gia tri', 'Ghi chu / Don vi'], rows: finRows },
    { sheet: 'NguoiDung_HeThong', headers: ['ID', 'Ten dang nhap', 'Email', 'Ho ten', 'Vai tro', 'Trang thai'], rows: userRows },
    { sheet: 'KhoaHoc_KiemDuyet', headers: ['ID', 'Tieu de khoa hoc', 'Gia', 'Trang thai', 'Hoc vien'], rows: courseRows },
  ])

  return 'Đã xuất tệp Excel Báo cáo Quản trị Toàn sàn (learnhub-admin-quan-tri.xls) dành riêng cho Quản trị viên.'
}

async function runInstructorReport(): Promise<string> {
  const [payoutRes, studioRes, couponRes] = await Promise.allSettled([
    axiosClient.get('/api/commerce/instructor/payouts'),
    axiosClient.get('/api/catalog/instructor/courses'),
    axiosClient.get('/api/catalog/coupons'),
  ])

  const d = payoutRes.status === 'fulfilled' ? (payoutRes.value.data?.data as Record<string, unknown> || {}) : {}
  const studio = studioRes.status === 'fulfilled' ? ((studioRes.value.data?.data || []) as Record<string, unknown>[]) : []
  const coupons = couponRes.status === 'fulfilled' ? ((couponRes.value.data?.data || []) as Record<string, unknown>[]) : []
  const kyc = seller()

  // Sheet 1: ThuNhap_Studio
  const earnRows: (string | number)[][] = [
    ['Doanh thu ban khoa hoc cua toi (Gross)', Number(d.gross || 0), 'VND (Doanh thu tu hoc vien mua khoa cua ban)'],
    ['Phi nen tang khau tru (30% san)', Number(d.platformFee || 0), 'VND (Chi phi ha tang & van hanh san)'],
    ['Thuc linh cua giang vien (Net 70%)', Number(d.net || 0), 'VND (So tien thuc ve tai khoan ngan hang)'],
    ['So luot hoc vien da mua khoa', Number(d.orderItemCount || 0), 'Suat hoc vien da thanh toan'],
    ['', '', ''],
    ['--- THONG TIN TAI KHOAN NHAN TIEN ---', '', ''],
    ['Chu tai khoan ngan hang', String(kyc.accountName || kyc.fullName || 'Chua cap nhat'), 'Nguoi thu huong'],
    ['So tai khoan ngan hang', String(kyc.accountNumber || 'Chua cap nhat'), 'STK'],
    ['Ngan hang thu huong', String(kyc.bank || 'Chua cap nhat'), 'Ngan hang'],
    ['Trang thai xac minh KYC', String(kyc.kyc || 'Chua xac minh'), 'Ho so thanh toan'],
    ['Thoi diem xuat file', new Date().toLocaleString('vi-VN'), 'Ngay tao bao cao'],
  ]

  // Sheet 2: KhoaHoc_CuaToi
  const myCourseRows: (string | number)[][] = studio.map((c) => [
    String(c.title || ''),
    String(c.status || ''),
    Number(c.price || 0),
    Number(c.enrollmentCount || 0),
  ])

  // Sheet 3: Voucher_CuaShop
  const myCouponRows: (string | number)[][] = coupons.map((cp) => [
    String(cp.code || ''),
    `${cp.discountPercent || 0}%`,
    Number(cp.usedCount || 0),
    Number(cp.maxUses || 0),
    cp.active ? 'Hieu luc' : 'Het han / Tam dung',
  ])

  downloadWorkbook('learnhub-giang-vien-thu-nhap.xls', [
    { sheet: 'ThuNhap_Studio', headers: ['Chi so thu nhap giang vien', 'Gia tri', 'Giai thich'], rows: earnRows },
    { sheet: 'KhoaHoc_CuaToi', headers: ['Tieu de khoa hoc Studio', 'Trang thai', 'Gia niem yet', 'Hoc vien dang ky'], rows: myCourseRows },
    { sheet: 'Voucher_CuaShop', headers: ['Ma voucher', 'Phan tram giam', 'Da dung', 'Toi da', 'Hieu luc'], rows: myCouponRows },
  ])

  return 'Đã xuất tệp Excel Báo cáo Thu nhập & Khóa học Studio (learnhub-giang-vien-thu-nhap.xls) dành riêng cho Giảng viên.'
}

export async function runExport(kind: ExportKind, role?: string): Promise<string> {
  // BẢO VỆ TUYỆT ĐỐI: CHỈ ADMIN VÀ INSTRUCTOR ĐƯỢC XUẤT EXCEL
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
    return 'Tính năng xuất báo cáo Excel chỉ dành cho Giảng viên và Quản trị viên hệ thống. Học viên không có quyền xuất file Excel.'
  }

  // VAI TRÒ ADMIN
  if (role === 'ADMIN') {
    if (kind === 'admin_report') {
      return runAdminReport()
    }
    if (kind === 'revenue' || kind === 'admin_revenue') {
      try {
        await downloadExcel('/api/commerce/admin/export', 'learnhub-admin-doanh-thu.xlsx')
        return 'Đã tải file Excel Doanh thu toàn sàn (learnhub-admin-doanh-thu.xlsx) cho Admin.'
      } catch {
        const res = await axiosClient.get('/api/commerce/admin/analytics').catch(() => null)
        const s = (res?.data?.data as Record<string, unknown>)?.summary as Record<string, unknown> || {}
        downloadRows('learnhub-admin-doanh-thu.xls', 'DoanhThu_Admin',
          ['Chi so doanh thu toan san', 'Gia tri (VND)'],
          [
            ['Tong doanh thu toan san (Gross)', Number(s.revenue || 0)],
            ['Phi hoa hong san thu ve (30%)', Number(s.platformFee || 0)],
            ['Tong chi tra giang vien (70%)', Number(s.instructorEarn || 0)],
            ['So don thanh cong (PAID)', Number(s.paidOrders || 0)],
            ['Gia tri don trung binh', Number(s.avgOrder || 0)],
          ])
        return 'Đã tải file Excel Doanh thu toàn sàn (learnhub-admin-doanh-thu.xls) cho Admin.'
      }
    }
    if (kind === 'users' || kind === 'admin_users') {
      try {
        await downloadExcel('/api/users/admin/export', 'learnhub-admin-tai-khoan.xlsx')
        return 'Đã tải file Excel Tài khoản hệ thống (learnhub-admin-tai-khoan.xlsx) cho Admin.'
      } catch {
        const users = await allPages('/api/users')
        downloadRows('learnhub-admin-tai-khoan.xls', 'TaiKhoan_Admin',
          ['ID', 'Ten dang nhap', 'Email', 'Ho ten', 'Vai tro', 'Khoa'],
          users.map((user) => [
            Number(user.id || 0),
            String(user.username || ''),
            String(user.email || ''),
            String(user.fullName || ''),
            String(user.role || ''),
            user.locked ? 'Khoa' : 'Hoat dong',
          ]))
        return 'Đã tải file Excel Tài khoản hệ thống (learnhub-admin-tai-khoan.xls) cho Admin.'
      }
    }
    if (kind === 'courses' || kind === 'admin_courses') {
      try {
        await downloadExcel('/api/catalog/admin/export', 'learnhub-admin-khoa-hoc.xlsx')
        return 'Đã tải file Excel Danh mục & Kiểm duyệt Khóa học (learnhub-admin-khoa-hoc.xlsx) cho Admin.'
      } catch {
        const catalog = await axiosClient.get('/api/catalog/courses', { params: { size: 100 } }).then((res) => res.data?.data || []).catch(() => [])
        downloadRows('learnhub-admin-khoa-hoc.xls', 'KiemDuyet_Admin',
          ['ID', 'Tieu de khoa hoc', 'Gia niem yet', 'Trang thai duyet', 'Hoc vien'],
          catalog.map((c: Record<string, unknown>) => [
            Number(c.id || 0),
            String(c.title || ''),
            Number(c.price || 0),
            String(c.status || ''),
            Number(c.enrollmentCount || 0),
          ]))
        return 'Đã tải file Excel Danh mục & Kiểm duyệt Khóa học (learnhub-admin-khoa-hoc.xls) cho Admin.'
      }
    }
    return runAdminReport()
  }

  // VAI TRÒ GIẢNG VIÊN (INSTRUCTOR)
  if (role === 'INSTRUCTOR') {
    if (kind === 'instructor_report') {
      return runInstructorReport()
    }
    if (kind === 'payout' || kind === 'instructor_payout') {
      const d = (await axiosClient.get('/api/commerce/instructor/payouts')).data.data || {}
      const kyc = seller()
      downloadRows('learnhub-giang-vien-thuc-linh.xls', 'ThucLinh_GiangVien',
        ['Chi so thu nhap ca nhan', 'Gia tri', 'Ghi chu'],
        [
          ['Doanh thu ban khoa hoc cua toi', Number(d.gross || 0), 'VND'],
          ['Phi san khau tru (30%)', Number(d.platformFee || 0), 'VND'],
          ['Thuc linh cua giang vien (70%)', Number(d.net || 0), 'VND'],
          ['So luot hoc vien da mua', Number(d.orderItemCount || 0), 'Suat'],
          ['Chu tai khoan ngan hang', String(kyc.accountName || kyc.fullName || 'Chua cap nhat'), ''],
          ['So tai khoan ngan hang', String(kyc.accountNumber || 'Chua cap nhat'), ''],
          ['Ngan hang', String(kyc.bank || 'Chua cap nhat'), ''],
          ['Trang thai KYC', String(kyc.kyc || 'Chua xac minh'), ''],
        ])
      return 'Đã tải file Excel Thu nhập thực lĩnh cá nhân (learnhub-giang-vien-thuc-linh.xls) cho Giảng viên.'
    }
    if (kind === 'courses' || kind === 'instructor_courses') {
      const studio = await axiosClient.get('/api/catalog/instructor/courses').then((res) => res.data?.data || []).catch(() => [])
      downloadRows('learnhub-giang-vien-khoa-hoc-studio.xls', 'KhoaHoc_Studio',
        ['Tieu de khoa hoc Studio', 'Trang thai', 'Gia niem yet', 'Hoc vien'],
        studio.map((row: Record<string, unknown>) => [
          String(row.title || ''),
          String(row.status || ''),
          Number(row.price || 0),
          Number(row.enrollmentCount || 0),
        ]))
      return 'Đã tải file Excel Khóa học Studio của Giảng viên (learnhub-giang-vien-khoa-hoc-studio.xls).'
    }
    if (kind === 'coupons' || kind === 'instructor_coupons') {
      const rows = (await axiosClient.get('/api/catalog/coupons')).data?.data || []
      downloadRows('learnhub-giang-vien-voucher.xls', 'Voucher_GiangVien',
        ['Ma voucher', 'Phan tram giam', 'Da dung', 'Toi da', 'Hieu luc'],
        rows.map((row: Record<string, unknown>) => [
          String(row.code || ''),
          `${row.discountPercent || 0}%`,
          Number(row.usedCount || 0),
          Number(row.maxUses || 0),
          row.active ? 'Hieu luc' : 'Het han',
        ]))
      return 'Đã tải file Excel Voucher cá nhân (learnhub-giang-vien-voucher.xls) cho Giảng viên.'
    }
    return runInstructorReport()
  }

  return 'Tính năng xuất báo cáo Excel chỉ dành cho Giảng viên và Quản trị viên hệ thống. Học viên không có quyền xuất file Excel.'
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

  // 2. Chặn xuất Excel đối với học viên và khách (chỉ Giảng viên và Admin được phép)
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR' && isExcelRequest(question)) {
    return {
      text: vi
        ? 'Tính năng xuất báo cáo Excel chỉ dành cho Giảng viên và Quản trị viên hệ thống. Học viên không có quyền xuất file Excel. Bạn có thể theo dõi khóa học, đơn hàng và chứng chỉ trực tiếp trên giao diện website.'
        : 'Excel export is restricted to Instructors and Administrators only. Learners do not have permission to export Excel reports.',
      exportKind: null,
    }
  }

  // 3. Kiem tra lenh dieu huong Admin
  if (role === 'ADMIN') {
    const nav = detectAdminNav(question, role, vi)
    if (nav) {
      return { text: `${nav.text}\n[[NAV:${nav.path}]]`, exportKind: null }
    }
  }

  // 4. Kiem tra cau hoi san pham
  if (isProductQuestion(question)) {
    return { text: consultProducts(question, vi), exportKind: null }
  }

  const parsed = stripExport(aiText)
  // Xóa bỏ exportKind nếu người dùng không phải Admin hoặc Giảng viên
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
    parsed.exportKind = null
  }
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

  // 2. Chặn xuất Excel đối với học viên và khách (chỉ Giảng viên và Admin được phép)
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR' && isExcelRequest(question)) {
    return vi
      ? 'Tính năng xuất báo cáo Excel chỉ dành cho Giảng viên và Quản trị viên hệ thống. Học viên không có quyền xuất file Excel. Bạn có thể theo dõi khóa học, đơn hàng và chứng chỉ trực tiếp trên giao diện website.'
      : 'Excel export is restricted to Instructors and Administrators only. Learners do not have permission to export Excel reports.'
  }

  // 3. Kiem tra lenh dieu huong Admin
  if (role === 'ADMIN') {
    const nav = detectAdminNav(question, role, vi)
    if (nav) {
      return `${nav.text}\n[[NAV:${nav.path}]]`
    }
  }

  // 4. Kiem tra tu van san pham
  if (isProductQuestion(question)) {
    return consultProducts(question, vi)
  }

  // 5. Tra cuu so lieu he thong
  const dataAsk = isDataQuestion(question)
  if (dataAsk && briefing) {
    return vi
      ? `Số liệu lấy lúc bạn hỏi:\n${briefing.replace(/Nếu người dùng[\s\S]*$/, '').replace(/Nếu bảo xuất[\s\S]*$/, '').replace(/QUY ĐỊNH AN TOÀN[\s\S]*$/, '').trim()}`
      : `Live figures from this moment:\n${briefing}`
  }

  if (role === 'ADMIN') {
    return vi
      ? 'Bạn đang dùng AI quản trị. Ra lệnh "mở [chức năng]" (tài khoản, duyệt khóa, doanh thu, kyc, coupon, báo cáo...) để AI tự động chuyển trang. Hoặc hỏi doanh thu, coupon, bảo xuất file Excel báo cáo quản trị toàn sàn.'
      : 'Admin AI. Say "open [feature]" to auto-navigate, or ask for revenue, coupons, and platform Excel reports.'
  }
  if (role === 'INSTRUCTOR') {
    return vi
      ? 'Hãy hỏi doanh thu, thực lĩnh, voucher, hồ sơ nhận tiền, người mua đã nhắn, hoặc bảo xuất file Excel báo cáo thu nhập studio giảng viên.'
      : 'Ask for payout, vouchers, KYC, buyers who messaged you, or an instructor studio Excel export.'
  }
  return vi
    ? 'Chào bạn! Mình là AI trợ lý của LearnHub. Bạn có thể hỏi mình tư vấn các sản phẩm khóa học, lộ trình học tập, xem giỏ hàng hoặc chính sách hoàn tiền.'
    : 'Welcome! I am LearnHub AI Assistant. Ask me about course products, learning paths, your cart, or refund policies.'
}

