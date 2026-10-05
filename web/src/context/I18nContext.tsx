import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

const dict = {
  vi: {
    home: 'Trang chủ',
    courses: 'Khóa học',
    cart: 'Giỏ hàng',
    learning: 'Khóa học của tôi',
    login: 'Đăng nhập',
    register: 'Đăng ký',
    logout: 'Đăng xuất',
    help: 'Trợ giúp',
    studio: 'Studio',
    admin: 'Cổng quản trị',
    adminPortal: 'Cổng quản trị',
    business: 'Doanh nghiệp',
    search: 'Tìm khóa học',
    searchToday: 'Bạn muốn học gì hôm nay?',
    browse: 'Duyệt',
    allCourses: 'Tất cả khóa học',
    guided: 'Gợi ý khóa học',
    getLearnHub: 'Tham gia LearnHub',
    heroTitle: 'Học từ người giỏi nhất, trở thành tốt nhất.',
    heroSubtitle: 'Chọn điều bạn muốn học hôm nay.',
    explore: 'Bắt đầu học',
    bestsellers: 'Phổ biến',
    meetBest: 'Gặp những người giỏi nhất.',
    goalBiz: 'Kinh doanh và khởi nghiệp',
    goalLead: 'Lãnh đạo và quản lý',
    goalCreate: 'Sáng tạo và nghệ thuật',
    goalTech: 'Công nghệ và dữ liệu',
    goalDesign: 'Thiết kế và sản phẩm',
    membershipTitle: 'Một tài khoản. Cả thư viện.',
    benefit1: 'Hàng nghìn giờ video từ chuyên gia, sở hữu trọn đời.',
    benefit2: 'Học trên web, mọi lúc, tốc độ của bạn.',
    benefit3: 'Gợi ý AI cá nhân hóa theo mục tiêu.',
    benefit4: 'Chứng nhận hoàn thành cho hồ sơ của bạn.',
    allCategories: 'Tất cả danh mục',
    find: 'Tìm',
    addToCart: 'Thêm vào giỏ',
    reviews: 'Đánh giá',
    students: 'học viên',
    checkout: 'Thanh toán',
    coupon: 'Mã giảm giá',
    gift: 'Mua tặng',
    subtotal: 'Tạm tính',
    lifetime: 'Sở hữu trọn đời',
    emptyLearning: 'Chưa mua khóa nào. Vào mục Khóa học để đăng ký.',
    notFound: 'Không tìm thấy trang.',
    backHome: 'Về trang chủ',
    paySuccessTitle: 'Thanh toán thành công',
    paySuccessBody: 'Khóa học đã được thêm vào tài khoản của bạn, sở hữu trọn đời.',
    viewPurchased: 'Xem khóa học đã mua',
    overview: 'Tổng quan nền tảng',
    overviewHint: 'Số liệu thật từ catalog, hiện theo không gian 3D.',
    statCourses: 'Khóa học',
    statCategories: 'Danh mục',
    featured: 'Nổi bật',
    seeMore: 'Xem thêm',
    bestSeller: 'Bán chạy',
    aCourseBy: 'Khóa học của giảng viên LearnHub',
    buy: 'Mua',
    coursesHero: 'Khóa học trực tuyến cho người muốn giỏi hơn',
    onlineIn: 'Khóa học',
    newCourses: 'Khóa học mới',
    topRated: 'Đánh giá cao',
    popularCourses: 'Khóa phổ biến',
    categories: 'Danh mục',
    isNew: 'Mới',
    account: 'Tài khoản',
    certs: 'Chứng chỉ',
  },
  en: {
    home: 'Home',
    courses: 'Courses',
    cart: 'Cart',
    learning: 'My learning',
    login: 'Log in',
    register: 'Sign up',
    logout: 'Log out',
    help: 'Help',
    studio: 'Studio',
    admin: 'Admin console',
    adminPortal: 'Admin console',
    business: 'Business',
    search: 'Search courses',
    searchToday: 'What do you want to learn today?',
    browse: 'Browse',
    allCourses: 'All courses',
    guided: 'Guided courses',
    getLearnHub: 'Get LearnHub',
    heroTitle: 'Learn from the best, be your best.',
    heroSubtitle: 'Choose what you want to learn today.',
    explore: 'Start learning',
    bestsellers: 'Popular',
    meetBest: "Meet the world's best.",
    goalBiz: 'Business and entrepreneurship',
    goalLead: 'Leadership and management',
    goalCreate: 'Creativity and the arts',
    goalTech: 'Technology and data',
    goalDesign: 'Design and product',
    membershipTitle: 'One membership. The whole library.',
    benefit1: 'Thousands of expert-led hours, yours for life.',
    benefit2: 'Learn on the web, anytime, at your pace.',
    benefit3: 'Personal AI recommendations for your goals.',
    benefit4: 'Completion certificates for your profile.',
    allCategories: 'All categories',
    find: 'Search',
    addToCart: 'Add to cart',
    reviews: 'Reviews',
    students: 'learners',
    checkout: 'Checkout',
    coupon: 'Coupon code',
    gift: 'Buy as a gift',
    subtotal: 'Subtotal',
    lifetime: 'Lifetime access',
    emptyLearning: 'You have not purchased a course yet. Browse the catalog to enroll.',
    notFound: 'Page not found.',
    backHome: 'Back to home',
    paySuccessTitle: 'Purchase complete',
    paySuccessBody: 'The course has been added to your library with lifetime access.',
    viewPurchased: 'View purchased courses',
    overview: 'Platform overview',
    overviewHint: 'Live catalog numbers, shown in a 3D layout.',
    statCourses: 'Courses',
    statCategories: 'Categories',
    featured: 'Featured',
    seeMore: 'See more',
    bestSeller: 'Best seller',
    aCourseBy: 'A course by a LearnHub instructor',
    buy: 'Buy',
    coursesHero: 'Online courses for people who want to get better',
    onlineIn: 'Online',
    newCourses: 'New courses',
    topRated: 'Top rated',
    popularCourses: 'Popular courses',
    categories: 'Categories',
    isNew: 'New',
    account: 'Account',
    certs: 'Certificates',
  },
}

type Locale = 'vi' | 'en'

const I18nContext = createContext<{
  locale: Locale
  t: (key: keyof typeof dict.vi) => string
  setLocale: (locale: Locale) => void
} | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem('lh_locale')
      if (saved === 'en' || saved === 'vi') return saved
    } catch { /* ignore */ }
    return 'vi'
  })
  const setLocale = (next: Locale) => {
    setLocaleState(next)
    try { localStorage.setItem('lh_locale', next) } catch { /* ignore */ }
  }
  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key: keyof typeof dict.vi) => dict[locale][key],
  }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be inside I18nProvider')
  return ctx
}
