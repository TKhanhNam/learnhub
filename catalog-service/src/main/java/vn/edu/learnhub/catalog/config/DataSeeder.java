// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/config/DataSeeder.java
// purpose: tao du lieu mau (danh muc + khoa hoc da phat hanh) de trang chu co noi dung ngay.
// instructor_id 2 = teacher1, 3 = teacher2 (theo thu tu seed cua identity-service).

package vn.edu.learnhub.catalog.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.catalog.entity.Category;
import vn.edu.learnhub.catalog.entity.Coupon;
import vn.edu.learnhub.catalog.entity.Course;
import vn.edu.learnhub.catalog.repository.CouponRepository;
import vn.edu.learnhub.catalog.repository.CourseRepository;
import vn.edu.learnhub.catalog.service.CatalogService;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final CatalogService catalogService;
    private final CourseRepository courseRepository;
    private final CouponRepository couponRepository;

    public DataSeeder(CatalogService catalogService,
                      CourseRepository courseRepository,
                      CouponRepository couponRepository) {
        this.catalogService = catalogService;
        this.courseRepository = courseRepository;
        this.couponRepository = couponRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        Category programming = catalogService.ensureCategory("Lập trình", "lap-trinh", "Java, Spring Boot, React, Python...");
        Category business = catalogService.ensureCategory("Kinh doanh", "kinh-doanh", "Khởi nghiệp, quản trị, bán hàng");
        Category design = catalogService.ensureCategory("Thiết kế", "thiet-ke", "UI/UX, Figma, đồ họa");
        Category marketing = catalogService.ensureCategory("Marketing", "marketing", "Digital marketing, SEO, quảng cáo");
        Category ai = catalogService.ensureCategory("AI", "ai", "Machine Learning, LLM, ứng dụng AI");
        Category selfGrowth = catalogService.ensureCategory("Phát triển bản thân", "phat-trien-ban-than", "Kỹ năng mềm, năng suất cá nhân");
        Category certification = catalogService.ensureCategory("Luyện thi chứng chỉ", "luyen-thi-chung-chi", "AWS, CompTIA, PMI và các đề thi thử");
        Category math = catalogService.ensureCategory("Toán", "toan", "Đại số, giải tích, xác suất thống kê");
        Category literature = catalogService.ensureCategory("Văn", "van", "Văn học, nghị luận, kỹ năng viết");
        Category chemistry = catalogService.ensureCategory("Hóa", "hoa", "Hóa vô cơ, hữu cơ, thí nghiệm");
        Category physics = catalogService.ensureCategory("Vật lý", "vat-ly", "Cơ, điện, quang học");
        Category biology = catalogService.ensureCategory("Sinh học", "sinh-hoc", "Tế bào, di truyền, sinh thái");
        Category it = catalogService.ensureCategory("Tin học", "tin-hoc", "Tin học văn phòng, mạng, an toàn thông tin");
        Category language = catalogService.ensureCategory("Ngoại ngữ", "ngoai-ngu", "Tiếng Anh, IELTS, giao tiếp");
        Category history = catalogService.ensureCategory("Lịch sử", "lich-su", "Lịch sử Việt Nam và thế giới");
        Category geo = catalogService.ensureCategory("Địa lý", "dia-ly", "Địa lý tự nhiên và kinh tế");
        Category econ = catalogService.ensureCategory("Kinh tế", "kinh-te", "Vi mô, vĩ mô, tài chính");
        Category music = catalogService.ensureCategory("Âm nhạc", "am-nhac", "Nhạc lý, piano, guitar, thanh nhạc");
        Category photo = catalogService.ensureCategory("Nhiếp ảnh", "nhiep-anh", "Máy ảnh, ánh sáng, hậu kỳ");
        Category video = catalogService.ensureCategory("Video", "video", "Quay phim, dựng phim, YouTube");
        Category anim = catalogService.ensureCategory("3D & Animation", "animation-3d", "Blender, motion, nhân vật 3D");
        Category arch = catalogService.ensureCategory("Kiến trúc", "kien-truc", "Thiết kế không gian, AutoCAD, SketchUp");
        Category fashion = catalogService.ensureCategory("Thời trang", "thoi-trang", "Thiết kế thời trang, styling");
        Category writing = catalogService.ensureCategory("Viết lách", "viet-lach", "Copywriting, storytelling, nội dung");
        Category webapp = catalogService.ensureCategory("Web & App", "web-app", "Thiết kế và phát triển web, ứng dụng");
        Category culinary = catalogService.ensureCategory("Ẩm thực", "am-thuc", "Nấu ăn, bánh, barista");
        Category wellness = catalogService.ensureCategory("Sức khỏe", "suc-khoe", "Yoga, dinh dưỡng, thể thao");

        seed("Java Spring Boot từ cơ bản đến microservices", programming.getId(), 2L, "899000", "INTERMEDIATE", "Java,Spring Boot,REST API,Microservices", "Học cách xây dựng hệ thống nhiều service thật sự chạy được", true);
        seed("React + TypeScript cho người mới", programming.getId(), 2L, "599000", "BEGINNER", "React,TypeScript,Vite,Frontend", "Từ component đầu tiên đến ứng dụng hoàn chỉnh", false);
        seed("Python cho phân tích dữ liệu", programming.getId(), 2L, "499000", "BEGINNER", "Python,Pandas,Data Analysis", "Làm sạch, phân tích và trực quan hóa dữ liệu", false);
        seed("Thiết kế UI/UX với Figma", design.getId(), 3L, "450000", "BEGINNER", "Figma,UI,UX,Design System", "Quy trình thiết kế sản phẩm số từ đầu đến cuối", false);
        seed("Digital Marketing thực chiến", marketing.getId(), 3L, "650000", "INTERMEDIATE", "SEO,Google Ads,Content,Analytics", "Chạy chiến dịch thật và đo lường hiệu quả", false);
        seed("Khởi nghiệp tinh gọn cho người Việt", business.getId(), 3L, "350000", "BEGINNER", "Startup,Lean Canvas,Bán hàng", "Kiểm chứng ý tưởng trước khi đốt tiền", false);
        seed("Ứng dụng LLM vào sản phẩm thực tế", ai.getId(), 2L, "1200000", "ADVANCED", "AI,LLM,Prompt Engineering,RAG", "Từ prompt đến kiến trúc RAG cho doanh nghiệp", true);
        seed("Quản lý thời gian và năng suất cá nhân", selfGrowth.getId(), 3L, "199000", "BEGINNER", "Năng suất,Kỹ năng mềm", "Hệ thống làm việc không bị quá tải", false);
        seed("Luyện thi AWS Cloud Practitioner", certification.getId(), 2L, "750000", "INTERMEDIATE", "AWS,Cloud,Practice Test", "Kèm 3 đề thi thử sát đề thật", false);
        seed("Luyện thi PMI — quản lý dự án", certification.getId(), 3L, "980000", "ADVANCED", "PMI,Quản lý dự án,Practice Test", "Ôn tập theo khung PMBOK kèm đề thi thử", false);

        seed("Trí tuệ nhân tạo cho người bắt đầu", ai.getId(), 2L, "690000", "BEGINNER", "AI,Machine Learning,Python", "Hiểu machine learning qua ví dụ đời thường", true);
        seed("Prompt Engineering làm chủ ChatGPT", ai.getId(), 2L, "390000", "BEGINNER", "AI,Prompt,ChatGPT", "Viết prompt ra kết quả đúng việc", true);
        seed("Computer Vision với Python", ai.getId(), 2L, "890000", "INTERMEDIATE", "AI,OpenCV,Computer Vision", "Nhận diện ảnh và video từ camera", false);

        seed("Toán cấp 3 ôn thi THPT", math.getId(), 3L, "299000", "BEGINNER", "Toán,Đại số,Hình học", "Ôn tập hệ thống theo chuyên đề thi", false);
        seed("Giải tích 1 cho sinh viên", math.getId(), 2L, "420000", "INTERMEDIATE", "Toán,Giải tích,Đạo hàm", "Giới hạn, đạo hàm, tích phân có bài tập", false);
        seed("Xác suất thống kê ứng dụng", math.getId(), 2L, "450000", "INTERMEDIATE", "Toán,Xác suất,Thống kê", "Từ công thức đến phân tích dữ liệu", false);

        seed("Nghị luận văn học THPT", literature.getId(), 3L, "249000", "BEGINNER", "Văn,Nghị luận,Văn học", "Khung bài và dẫn chứng hay gặp", false);
        seed("Văn học Việt Nam hiện đại", literature.getId(), 3L, "320000", "INTERMEDIATE", "Văn,Văn học,Phân tích", "Đọc hiểu tác giả và tác phẩm tiêu biểu", false);

        seed("Hóa hữu cơ từ gốc", chemistry.getId(), 3L, "350000", "BEGINNER", "Hóa,Hữu cơ,Phản ứng", "Cơ chế phản ứng và bài tập có lời giải", false);
        seed("Hóa vô cơ và bảng tuần hoàn", chemistry.getId(), 3L, "280000", "BEGINNER", "Hóa,Vô cơ,Nguyên tố", "Tính chất nguyên tố, oxi hóa khử", false);

        seed("Vật lý cơ học THPT", physics.getId(), 2L, "310000", "BEGINNER", "Vật lý,Cơ học", "Động học, lực, năng lượng", false);
        seed("Điện xoay chiều và mạch điện", physics.getId(), 2L, "360000", "INTERMEDIATE", "Vật lý,Điện", "Định luật Kirchhoff đến mạch RLC", false);

        seed("Sinh học tế bào và di truyền", biology.getId(), 3L, "330000", "BEGINNER", "Sinh học,Di truyền,ADN", "Từ tế bào đến quy luật Mendel", false);
        seed("Sinh thái học và môi trường", biology.getId(), 3L, "270000", "BEGINNER", "Sinh học,Sinh thái", "Hệ sinh thái, bảo tồn, biến đổi khí hậu", false);

        seed("Tin học văn phòng Excel Word PowerPoint", it.getId(), 3L, "199000", "BEGINNER", "Tin học,Excel,Word", "Làm việc văn phòng thành thạo", false);
        seed("Mạng máy tính căn bản", it.getId(), 2L, "420000", "BEGINNER", "Tin học,Mạng,TCP/IP", "IP, subnet, thiết bị mạng", false);
        seed("An toàn thông tin cho người dùng", it.getId(), 2L, "390000", "BEGINNER", "Tin học,Bảo mật,Cybersecurity", "Mật khẩu, phishing, sao lưu dữ liệu", false);

        seed("Tiếng Anh giao tiếp 90 ngày", language.getId(), 3L, "450000", "BEGINNER", "Tiếng Anh,Giao tiếp", "Phát âm và hội thoại hằng ngày", false);
        seed("Luyện thi IELTS 6.5+", language.getId(), 3L, "890000", "INTERMEDIATE", "IELTS,Tiếng Anh", "Chiến lược 4 kỹ năng và đề thi thử", false);

        seed("Lịch sử Việt Nam thế kỷ 20", history.getId(), 3L, "220000", "BEGINNER", "Lịch sử,Việt Nam", "Các mốc lớn và tư liệu gốc", false);
        seed("Địa lý kinh tế Việt Nam", geo.getId(), 3L, "210000", "BEGINNER", "Địa lý,Kinh tế", "Vùng miền, tài nguyên, đô thị", false);
        seed("Kinh tế vi mô nhập môn", econ.getId(), 2L, "380000", "BEGINNER", "Kinh tế,Vi mô", "Cung cầu, chi phí, thị trường", false);

        seed("Piano cho người mới bắt đầu", music.getId(), 3L, "490000", "BEGINNER", "Piano,Nhạc lý", "Hợp âm, tiết tấu, bài hát đầu tiên", false);
        seed("Nhiếp ảnh điện thoại và máy ảnh", photo.getId(), 3L, "390000", "BEGINNER", "Nhiếp ảnh,Ánh sáng", "Bố cục, ánh sáng, chỉnh màu", false);
        seed("Dựng video với Premiere Pro", video.getId(), 2L, "590000", "BEGINNER", "Video,Premiere,YouTube", "Cắt ghép, subtitle, xuất bản", false);
        seed("Blender 3D cho người mới", anim.getId(), 2L, "690000", "BEGINNER", "Blender,3D,Animation", "Model, material, render cảnh đầu tiên", false);
        seed("SketchUp thiết kế nhà ở", arch.getId(), 3L, "520000", "BEGINNER", "Kiến trúc,SketchUp", "Mặt bằng, phối cảnh nội thất", false);
        seed("Styling và phối đồ cá nhân", fashion.getId(), 3L, "290000", "BEGINNER", "Thời trang,Styling", "Màu sắc, form dáng, capsule wardrobe", false);
        seed("Copywriting bán hàng", writing.getId(), 3L, "350000", "BEGINNER", "Viết,Copywriting", "Headline, landing page, email", false);
        seed("Thiết kế landing page Webflow", webapp.getId(), 2L, "560000", "BEGINNER", "Web,Webflow,UI", "Từ wireframe đến trang chạy quảng cáo", false);
        seed("Nấu ăn gia đình 30 món", culinary.getId(), 3L, "250000", "BEGINNER", "Ẩm thực,Nấu ăn", "Món Việt hằng ngày, mẹo gia vị", false);
        seed("Yoga tại nhà 15 phút", wellness.getId(), 3L, "180000", "BEGINNER", "Yoga,Sức khỏe", "Giãn cơ, thở, giảm đau lưng", false);

        seed("Bán hàng online cho cửa hàng nhỏ", business.getId(), 3L, "320000", "BEGINNER", "Kinh doanh,Bán hàng", "Shopee, Facebook và chăm sóc khách", false);
        seed("Quản trị nhóm và họp hiệu quả", business.getId(), 3L, "410000", "INTERMEDIATE", "Kinh doanh,Quản lý", "Điều hành team 5 đến 20 người", false);
        seed("Photoshop từ zero đến poster", design.getId(), 3L, "480000", "BEGINNER", "Thiết kế,Photoshop", "Retouch, layer, poster sự kiện", false);
        seed("Thiết kế logo và nhận diện thương hiệu", design.getId(), 3L, "550000", "INTERMEDIATE", "Thiết kế,Branding", "Từ brief đến bộ nhận diện hoàn chỉnh", false);
        seed("SEO nội dung lên top Google", marketing.getId(), 3L, "470000", "BEGINNER", "Marketing,SEO", "Keyword, on-page, đo lường Search Console", false);
        seed("Chạy ads Facebook và TikTok", marketing.getId(), 3L, "620000", "INTERMEDIATE", "Marketing,Ads", "Chiến dịch, audience, tối ưu CPA", false);
        seed("Nói trước công chúng không run", selfGrowth.getId(), 3L, "240000", "BEGINNER", "Kỹ năng mềm,Thuyết trình", "Cấu trúc bài nói và kiểm soát hơi", false);
        seed("Tư duy phản biện hàng ngày", selfGrowth.getId(), 3L, "260000", "BEGINNER", "Kỹ năng mềm,Tư duy", "Đặt câu hỏi, tránh ngụy biện", false);
        seed("Luyện thi TOEIC 750+", certification.getId(), 3L, "690000", "INTERMEDIATE", "TOEIC,Chứng chỉ", "Chiến lược listening reading và đề thử", false);
        seed("Làm văn miêu tả và biểu cảm", literature.getId(), 3L, "210000", "BEGINNER", "Văn,Viết", "Hình ảnh, chi tiết, giọng văn", false);
        seed("Hóa học THPT ôn thi khối B", chemistry.getId(), 3L, "340000", "INTERMEDIATE", "Hóa,THPT", "Chuyên đề điện phân, pe,este", false);
        seed("Vật lý quang học và sóng", physics.getId(), 2L, "330000", "INTERMEDIATE", "Vật lý,Quang học", "Giao thoa, khúc xạ, bài tập thi", false);
        seed("Giải phẫu người cơ bản", biology.getId(), 3L, "390000", "BEGINNER", "Sinh học,Giải phẫu", "Cơ, xương, tuần hoàn cho người mới", false);
        seed("Tiếng Anh grammar cấp tốc", language.getId(), 3L, "280000", "BEGINNER", "Tiếng Anh,Grammar", "12 thì và cấu trúc hay dùng", false);
        seed("Lịch sử thế giới cận đại", history.getId(), 3L, "230000", "BEGINNER", "Lịch sử,Thế giới", "Cách mạng công nghiệp đến thế chiến", false);
        seed("Đọc sử qua bản đồ và tư liệu", history.getId(), 3L, "200000", "BEGINNER", "Lịch sử,Phương pháp", "Phương pháp sử học cho học sinh", false);
        seed("Địa lý tự nhiên các châu lục", geo.getId(), 3L, "220000", "BEGINNER", "Địa lý,Tự nhiên", "Khí hậu, địa hình, sông ngòi", false);
        seed("Bản đồ và GIS cho người mới", geo.getId(), 2L, "360000", "BEGINNER", "Địa lý,GIS", "Đọc bản đồ, tọa độ, lớp dữ liệu", false);
        seed("Kinh tế vĩ mô dễ hiểu", econ.getId(), 2L, "400000", "BEGINNER", "Kinh tế,Vĩ mô", "GDP, lạm phát, lãi suất", false);
        seed("Tài chính cá nhân 101", econ.getId(), 3L, "290000", "BEGINNER", "Kinh tế,Tài chính", "Ngân sách, quỹ khẩn, đầu tư sơ cấp", false);
        seed("Guitar đệm hát 30 ngày", music.getId(), 3L, "360000", "BEGINNER", "Guitar,Âm nhạc", "Hợp âm cơ bản và 10 bài hát", false);
        seed("Thanh nhạc hát đúng tông", music.getId(), 3L, "420000", "BEGINNER", "Thanh nhạc,Âm nhạc", "Hơi, cộng minh, luyện gam", false);
        seed("Chân dung studio với một đèn", photo.getId(), 3L, "450000", "INTERMEDIATE", "Nhiếp ảnh,Studio", "Ánh sáng, pose, hậu kỳ Lightroom", false);
        seed("Nhiếp ảnh đường phố buổi tối", photo.getId(), 3L, "370000", "BEGINNER", "Nhiếp ảnh,Street", "ISO, chống rung, kể chuyện bằng ảnh", false);
        seed("Quay Reels và Shorts chuyên nghiệp", video.getId(), 2L, "410000", "BEGINNER", "Video,Shorts", "Kịch bản 15 giây, máy, ánh sáng", false);
        seed("DaVinci Resolve màu phim", video.getId(), 2L, "640000", "INTERMEDIATE", "Video,Color", "Color wheel, LUT, xuất bản", false);
        seed("Nhân vật 3D trong Blender", anim.getId(), 2L, "790000", "INTERMEDIATE", "Blender,3D", "Sculpt, retopo, rig cơ bản", false);
        seed("Motion graphics After Effects", anim.getId(), 2L, "680000", "BEGINNER", "After Effects,Motion", "Logo reveal, lower third, explainer", false);
        seed("AutoCAD 2D bản vẽ nhà ở", arch.getId(), 3L, "540000", "BEGINNER", "AutoCAD,Kiến trúc", "Layer, dim, layout in ấn", false);
        seed("Nội thất căn hộ 60m2", arch.getId(), 3L, "480000", "BEGINNER", "Nội thất,Kiến trúc", "Công năng, ánh sáng, vật liệu", false);
        seed("May vá cơ bản tại nhà", fashion.getId(), 3L, "310000", "BEGINNER", "Thời trang,May", "Máy may, đường may, sửa quần áo", false);
        seed("Thiết kế rập áo sơ mi", fashion.getId(), 3L, "520000", "INTERMEDIATE", "Thời trang,Rập", "Số đo, rập, thử form", false);
        seed("Viết blog thu hút độc giả", writing.getId(), 3L, "270000", "BEGINNER", "Viết,Blog", "Cấu trúc bài, tiêu đề, giọng văn", false);
        seed("Kể chuyện ngắn 1000 chữ", writing.getId(), 3L, "300000", "BEGINNER", "Viết,Truyện", "Xung đột, nhân vật, kết", false);
        seed("HTML CSS dựng trang công ty", webapp.getId(), 2L, "390000", "BEGINNER", "HTML,CSS,Web", "Flexbox, responsive, form liên hệ", false);
        seed("App điện thoại với Flutter", webapp.getId(), 2L, "720000", "INTERMEDIATE", "Flutter,App", "Widget, navigation, gọi API", false);
        seed("Làm bánh mì và bánh ngọt", culinary.getId(), 3L, "280000", "BEGINNER", "Ẩm thực,Bánh", "Men, lò, công thức 12 món", false);
        seed("Pha chế cà phê tại nhà", culinary.getId(), 3L, "260000", "BEGINNER", "Ẩm thực,Cà phê", "Pour over, espresso, sữa", false);
        seed("Tập gym cho người mới", wellness.getId(), 3L, "220000", "BEGINNER", "Gym,Sức khỏe", "Lịch 3 buổi, kỹ thuật, dinh dưỡng", false);
        seed("Ăn uống lành mạnh 4 tuần", wellness.getId(), 3L, "240000", "BEGINNER", "Dinh dưỡng,Sức khỏe", "Thực đơn, macro, đi chợ", false);

        if (couponRepository.count() == 0) {
            Coupon platformCoupon = new Coupon();
            platformCoupon.setCode("LEARNHUB20");
            platformCoupon.setOwnerType(Coupon.OWNER_PLATFORM);
            platformCoupon.setDiscountPercent(20);
            platformCoupon.setMaxUses(500);
            platformCoupon.setValidFrom(Instant.now());
            platformCoupon.setValidTo(Instant.now().plus(60, ChronoUnit.DAYS));
            couponRepository.save(platformCoupon);
            log.info("Da tao ma giam gia mau LEARNHUB20 (-20%)");
        }
    }

    private void seed(String title, Long categoryId, Long instructorId, String price,
                      String level, String skills, String subtitle, boolean aiAssist) {
        if (courseRepository.existsByTitle(title)) {
            return;
        }
        Course course = new Course();
        course.setTitle(title);
        course.setSubtitle(subtitle);
        course.setDescription(subtitle + ". Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.");
        course.setCategoryId(categoryId);
        course.setInstructorId(instructorId);
        course.setPrice(new BigDecimal(price));
        course.setLevel(level);
        course.setLanguage("vi");
        course.setSkills(skills);
        course.setAiAssistEnabled(aiAssist);
        course.setStatus(Course.STATUS_PUBLISHED);
        course.setPublishedAt(Instant.now());
        course.setCreatedAt(Instant.now());
        catalogService.seedCourse(course);
        log.info("Da them khoa hoc mau: {}", title);
    }
}
