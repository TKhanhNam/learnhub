export interface Subject {
  slug: string
  vi: string
  en: string
}

export const SUBJECTS: Subject[] = [
  { slug: 'ai', vi: 'AI', en: 'AI' },
  { slug: 'toan', vi: 'Toán', en: 'Math' },
  { slug: 'van', vi: 'Văn', en: 'Literature' },
  { slug: 'hoa', vi: 'Hóa', en: 'Chemistry' },
  { slug: 'vat-ly', vi: 'Vật lý', en: 'Physics' },
  { slug: 'sinh-hoc', vi: 'Sinh học', en: 'Biology' },
  { slug: 'tin-hoc', vi: 'Tin học', en: 'IT' },
  { slug: 'lap-trinh', vi: 'Lập trình', en: 'Programming' },
  { slug: 'ngoai-ngu', vi: 'Ngoại ngữ', en: 'Languages' },
  { slug: 'lich-su', vi: 'Lịch sử', en: 'History' },
  { slug: 'dia-ly', vi: 'Địa lý', en: 'Geography' },
  { slug: 'kinh-te', vi: 'Kinh tế', en: 'Economics' },
  { slug: 'kinh-doanh', vi: 'Kinh doanh', en: 'Business' },
  { slug: 'marketing', vi: 'Marketing', en: 'Marketing' },
  { slug: 'thiet-ke', vi: 'Thiết kế', en: 'Design' },
  { slug: 'am-nhac', vi: 'Âm nhạc', en: 'Music' },
  { slug: 'nhiep-anh', vi: 'Nhiếp ảnh', en: 'Photography' },
  { slug: 'video', vi: 'Video', en: 'Video' },
  { slug: 'animation-3d', vi: '3D & Animation', en: '3D & Animation' },
  { slug: 'kien-truc', vi: 'Kiến trúc', en: 'Architecture' },
  { slug: 'thoi-trang', vi: 'Thời trang', en: 'Fashion' },
  { slug: 'viet-lach', vi: 'Viết lách', en: 'Writing' },
  { slug: 'web-app', vi: 'Web & App', en: 'Web & App' },
  { slug: 'am-thuc', vi: 'Ẩm thực', en: 'Culinary' },
  { slug: 'suc-khoe', vi: 'Sức khỏe', en: 'Wellness' },
  { slug: 'phat-trien-ban-than', vi: 'Phát triển bản thân', en: 'Personal growth' },
  { slug: 'luyen-thi-chung-chi', vi: 'Luyện thi chứng chỉ', en: 'Certificates' },
]

export const GUIDED_LINKS = [
  { to: '/courses', vi: 'Tất cả khóa học', en: 'All courses' },
  { to: '/courses', vi: 'Khóa học mới', en: 'New courses' },
  { to: '/courses', vi: 'Khóa phổ biến', en: 'Popular courses' },
  { to: '/courses?category=ai', vi: 'Khóa học AI', en: 'AI courses' },
  { to: '/courses?category=tin-hoc', vi: 'Tin học văn phòng', en: 'IT essentials' },
  { to: '/courses?category=toan', vi: 'Toán học', en: 'Math tracks' },
  { to: '/business', vi: 'Dành cho doanh nghiệp', en: 'For business' },
]
