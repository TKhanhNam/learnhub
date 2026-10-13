package vn.edu.learnhub.assist.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import vn.edu.learnhub.assist.dto.AssistDtos;
import vn.edu.learnhub.assist.entity.AssistChat;
import vn.edu.learnhub.assist.entity.HelpArticle;
import vn.edu.learnhub.assist.repository.AssistChatRepository;
import vn.edu.learnhub.assist.repository.HelpArticleRepository;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AssistService {
    private static final int MAX_QUESTION = 1000;

    private final HelpArticleRepository articleRepository;
    private final AssistChatRepository chatRepository;
    private final AiKeyPool ai;
    private final AtomicInteger extraPercent;

    public AssistService(HelpArticleRepository articleRepository,
                         AssistChatRepository chatRepository,
                         AiKeyPool ai,
                         @Value("${assist.ai-extra-percent:5}") int extraPercent) {
        this.articleRepository = articleRepository;
        this.chatRepository = chatRepository;
        this.ai = ai;
        this.extraPercent = new AtomicInteger(extraPercent);
    }

    public List<AssistDtos.AiKeyDTO> aiKeys() {
        return ai.status();
    }

    public List<AssistDtos.HelpDTO> help(String locale) {
        String loc = locale == null || locale.isBlank() ? "vi" : locale;
        return articleRepository.findByLocaleOrderByTitleAsc(loc).stream()
                .map(a -> new AssistDtos.HelpDTO(a.getId(), a.getSlug(), a.getTitle(), a.getBody(), a.getLocale(), a.getAudience()))
                .toList();
    }

    public AssistDtos.ChatDTO chat(Long userId, String role, AssistDtos.ChatRequest request) {
        String answer = answerFor(request.question(), role, request.briefing());
        AssistChat chat = new AssistChat();
        chat.setUserId(userId);
        chat.setCourseId(request.courseId());
        chat.setQuestion(request.question());
        chat.setAnswer(answer);
        chat = chatRepository.save(chat);
        return new AssistDtos.ChatDTO(chat.getId(), chat.getCourseId(), chat.getQuestion(),
                chat.getAnswer(), chat.getCreatedAt());
    }

    public AssistDtos.ChatDTO guestChat(AssistDtos.ChatRequest request) {
        String answer = answerFor(request.question(), "GUEST", request.briefing());
        return new AssistDtos.ChatDTO(null, request.courseId(), request.question(), answer, java.time.Instant.now());
    }

    private String answerFor(String question, String role, String briefing) {
        List<HelpArticle> articles = articleRepository.findAll().stream()
                .filter(article -> visible(article.getAudience(), role))
                .toList();
        String asked = question.length() > MAX_QUESTION ? question.substring(0, MAX_QUESTION) : question;
        String live = briefing == null ? "" : briefing.trim();
        if (live.length() > 8000) {
            live = live.substring(0, 8000);
        }
        String facts = live;
        String answer = ai.ask(systemPrompt(role, articles, facts), asked)
                .orElseGet(() -> keywordAnswer(question, role, articles, facts));
        if (buyerRole(role) && sellerAdvice(answer)) {
            return "Bạn đang dùng AI người mua. Gõ tên môn hoặc tên giảng viên vào ô tìm trên trang Khóa học để xem khóa và trang của giảng viên.";
        }
        return answer;
    }

    private static boolean buyerRole(String role) {
        return switch (role == null ? "" : role) {
            case "INSTRUCTOR", "ADMIN" -> false;
            default -> true;
        };
    }

    private static boolean sellerAdvice(String answer) {
        String folded = fold(answer);
        return folded.contains("studio")
                || folded.contains("kenh ban")
                || folded.contains("dat gia");
    }

    private static boolean visible(String audience, String role) {
        String group = audience == null || audience.isBlank() ? "all" : audience;
        if ("all".equals(group)) {
            return true;
        }
        return switch (role == null ? "" : role) {
            case "INSTRUCTOR" -> "seller".equals(group);
            case "ADMIN" -> "admin".equals(group);
            default -> "buyer".equals(group);
        };
    }

    private static boolean isMcpRestricted(String question) {
        String q = fold(question);
        return q.contains("he thong") || q.contains("system") || q.contains("backend")
                || q.contains("server") || q.contains("may chu") || q.contains("microservice")
                || q.contains("kien truc") || q.contains("architecture") || q.contains("docker")
                || q.contains("kubernetes") || q.contains("nginx") || q.contains("port")
                || q.contains("cong ket noi") || q.contains("ma nguon") || q.contains("source code")
                || q.contains("cau hinh") || q.contains("config") || q.contains("env")
                || q.contains("secret") || q.contains("internal key") || q.contains("jwt")
                || q.contains("co so du lieu") || q.contains("database") || q.contains("csdl")
                || q.matches(".*\\bdb\\b.*") || q.contains("sql") || q.contains("mysql")
                || q.contains("aiven") || q.contains("table") || q.contains("bang du lieu")
                || q.contains("schema") || q.contains("query") || q.contains("flyway")
                || q.contains("thong tin user") || q.contains("danh sach user") || q.contains("mat khau")
                || q.contains("password") || q.contains("hash") || q.contains("email nguoi dung")
                || q.contains("sdt") || q.contains("phone") || q.contains("cccd")
                || q.contains("thong tin kyc") || q.contains("admin account") || q.contains("tai khoan admin")
                || q.contains("hack") || q.contains("bypass") || q.contains("exploit")
                || q.contains("phan quyen admin") || q.contains("trao quyen admin");
    }

    private static String detectAdminNav(String question) {
        String q = fold(question);
        boolean isCmd = q.contains("mo") || q.contains("vao") || q.contains("chuyen") || q.contains("bat")
                || q.contains("xem") || q.contains("di den") || q.contains("open") || q.contains("goto");

        if (q.contains("tai khoan") || q.contains("user") || q.contains("nguoi dung") || q.contains("hoc vien") || q.contains("giang vien")) {
            return "Đã tự động mở chức năng Quản lý tài khoản (/admin/users) cho bạn.\n[[NAV:/admin/users]]";
        }
        if ((q.contains("duyet khoa") || q.contains("khoa cho duyet") || q.contains("khoa hoc") || q.contains("courses"))
                && !q.contains("doanh thu") && !q.contains("ban chay")) {
            return "Đã tự động mở chức năng Duyệt khóa học (/admin/courses) cho bạn.\n[[NAV:/admin/courses]]";
        }
        if ((q.contains("doanh thu") || q.contains("revenue") || q.contains("tai chinh") || q.contains("tien san")) && isCmd) {
            return "Đã tự động mở chức năng Doanh thu sàn (/admin/revenue) cho bạn.\n[[NAV:/admin/revenue]]";
        }
        if (q.contains("phan tich") || q.contains("analytics") || q.contains("bieu do") || q.contains("thong ke")) {
            return "Đã tự động mở chức năng Phân tích số liệu (/admin/analytics) cho bạn.\n[[NAV:/admin/analytics]]";
        }
        if ((q.contains("coupon") || q.contains("voucher") || q.contains("ma giam")) && isCmd) {
            return "Đã tự động mở chức năng Coupon sàn (/admin/coupons) cho bạn.\n[[NAV:/admin/coupons]]";
        }
        if ((q.contains("bao cao") || q.contains("reports")) && isCmd) {
            return "Đã tự động mở chức năng Báo cáo Excel (/admin/reports) cho bạn.\n[[NAV:/admin/reports]]";
        }
        if (q.contains("van hanh") || q.contains("desk") || q.contains("kyc") || q.contains("ho so") || q.contains("xac minh")) {
            return "Đã tự động mở chức năng Bàn vận hành & KYC (/admin/desk) cho bạn.\n[[NAV:/admin/desk]]";
        }
        if (q.contains("tong quan") || q.contains("dashboard") || q.contains("overview") || q.contains("trang chu admin")) {
            return "Đã tự động chuyển về trang Tổng quan quản trị (/admin) cho bạn.\n[[NAV:/admin]]";
        }
        if ((q.contains("trang hoc vien") || q.contains("trang chu") || q.contains("trang mua")) && isCmd) {
            return "Đã tự động chuyển về Trang chủ học viên cho bạn.\n[[NAV:/]]";
        }
        return null;
    }

    private static boolean isProductInquiry(String question) {
        String q = fold(question);
        return q.contains("san pham") || q.contains("khoa hoc") || q.contains("lap trinh")
                || q.contains("tieng anh") || q.contains("ngoai ngu") || q.contains("thiet ke")
                || q.contains("tin hoc") || q.contains("excel") || q.contains("marketing")
                || q.contains("goi y") || q.contains("tu van") || q.contains("muon hoc")
                || q.contains("nen hoc") || q.contains("co khoa nao") || q.contains("gia bao nhieu")
                || q.contains("de xuat") || q.contains("course") || q.contains("product")
                || q.contains("ban chay");
    }

    private static String consultProducts(String question) {
        String q = fold(question);
        if (q.contains("lap trinh") || q.contains("developer") || q.contains("coding")
                || q.contains("java") || q.contains("spring") || q.contains("react") || q.contains("python")) {
            return """
                    Chào bạn! Về mảng Lập trình, LearnHub xin tư vấn các sản phẩm khóa học chất lượng hàng đầu:

                    1. Java cơ bản cho người mới (Giảng viên: Mai Lan) - 499.000 đ [Cơ bản]
                    → Khóa nhập môn toàn diện: biến, vòng lặp, hướng đối tượng (OOP) và bài tập thực hành cuối mỗi chương.

                    2. Spring Boot thực hành chuyên sâu (Giảng viên: Trần Khoa) - 890.000 đ [Nâng cao]
                    → Xây dựng RESTful API, Spring Security, phân quyền người dùng và kết nối cơ sở dữ liệu doanh nghiệp.

                    3. SQL truy vấn dữ liệu (Giảng viên: Lê Hà) - 540.000 đ [Trung cấp]
                    → Thành thạo SELECT, JOIN, nhóm và tối ưu hóa xử lý bảng dữ liệu thực tế.

                    Bạn đang muốn bắt đầu từ con số 0 hay nâng cao để đi làm, hãy chia sẻ để mình tư vấn lộ trình chi tiết nhé!""";
        }
        if (q.contains("tieng anh") || q.contains("ngoai ngu") || q.contains("ielts") || q.contains("giao tiep")) {
            return """
                    Chào bạn! Về mảng Ngoại ngữ & Kỹ năng giao tiếp, LearnHub xin gợi ý:

                    1. IELTS Writing 6.5 (Giảng viên: Trần Khoa) - 790.000 đ [Trung cấp]
                    → Luyện dàn ý Task 1 & Task 2, bộ từ vựng học thuật theo chủ đề và chữa bài viết mẫu chi tiết.

                    2. Thuyết trình tự tin (Giảng viên: Lê Hà) - 420.000 đ [Trung cấp]
                    → Luyện mở bài thu hút, giữ nhịp tương tác và tự tin nói trước lớp hay đám đông.

                    Bạn đang ôn luyện thi chứng chỉ hay muốn cải thiện giao tiếp công sở?""";
        }
        if (q.contains("thiet ke") || q.contains("design") || q.contains("ui") || q.contains("ux")) {
            return """
                    Chào bạn! Về lĩnh vực Thiết kế & UI/UX, sản phẩm nổi bật nhất gồm:

                    1. Thiết kế giao diện căn bản (Giảng viên: Lê Hà) - 650.000 đ [Cơ bản]
                    → Nắm vững bố cục, màu sắc, typography và thực hành làm Landing Page hoàn chỉnh cho sản phẩm số.

                    2. Marketing cho khóa học (Giảng viên: Trần Khoa) - 610.000 đ [Cơ bản]
                    → Viết nội dung và thiết kế ấn phẩm truyền thông quảng cáo.

                    Khóa học có bài tập thực chiến và giảng viên phản hồi trực tiếp.""";
        }
        if (q.contains("tin hoc") || q.contains("excel") || q.contains("van phong")) {
            return """
                    Chào bạn! Về Tin học văn phòng & Dữ liệu thực chiến:

                    1. Excel cho công việc (Giảng viên: Mai Lan) - 350.000 đ [Cơ bản]
                    → Hàm tính toán thông dụng, bảng PivotTable, vẽ biểu đồ và tự động hóa báo cáo doanh thu.

                    2. SQL truy vấn dữ liệu (Giảng viên: Lê Hà) - 540.000 đ [Trung cấp]
                    → Phân tích dữ liệu học viên, đơn hàng và báo cáo thống kê.

                    Nhập mã LEARNHUB20 ở giỏ hàng để được giảm ngay 20% khi đăng ký bạn nhé!""";
        }
        return """
                Dạ chào bạn! LearnHub hiện có các nhóm sản phẩm khóa học chất lượng cao được đánh giá tốt nhất:

                📌 1. Lập trình & Công nghệ:
                - Java cơ bản cho người mới (499.000 đ, Mai Lan)
                - Spring Boot thực hành (890.000 đ, Trần Khoa)
                - SQL truy vấn dữ liệu (540.000 đ, Lê Hà)

                📌 2. Ngoại ngữ & Giao tiếp:
                - IELTS Writing 6.5 (790.000 đ, Trần Khoa)
                - Thuyết trình tự tin (420.000 đ, Lê Hà)

                📌 3. Thiết kế & Tin học văn phòng:
                - Thiết kế giao diện UI/UX căn bản (650.000 đ, Lê Hà)
                - Excel cho công việc (350.000 đ, Mai Lan)

                🎁 Ưu đãi độc quyền: Bạn có thể nhập mã LEARNHUB20 tại giỏ hàng để nhận ngay giảm giá 20%!
                Bạn đang quan tâm đến lĩnh vực nào để mình tư vấn lộ trình học phù hợp nhất nhé?""";
    }

    private static String systemPrompt(String role, List<HelpArticle> articles, String briefing) {
        String who = switch (role == null ? "" : role) {
            case "ADMIN" -> "quản trị viên. Có toàn quyền quản trị: doanh thu, phí sàn, duyệt khóa, quản lý tài khoản. Khi admin ra lệnh mở bất kỳ chức năng nào, trả lời xác nhận và xuất đúng mã [[NAV:<đường-dẫn>]].";
            case "INSTRUCTOR" -> "người bán. Trả số liệu thật: doanh thu, phí sàn, thực lĩnh, khóa của họ, voucher, hồ sơ nhận tiền. Xuất Excel khi được yêu cầu.";
            case "ORG_ADMIN" -> "người mua cho doanh nghiệp. Trả số liệu giỏ hàng, đơn, khóa đang học, chứng chỉ.";
            case "STUDENT" -> "người mua / học viên. Tư vấn khóa học, giải đáp học tập, đơn mua, giỏ hàng.";
            default -> "khách chưa đăng nhập. Tư vấn sản phẩm, khóa học, lộ trình học và chính sách sàn.";
        };
        StringBuilder facts = new StringBuilder();
        for (HelpArticle article : articles) {
            facts.append("- ").append(article.getTitle()).append(": ").append(article.getBody()).append('\n');
        }

        String securityInstructions;
        if (!"ADMIN".equals(role)) {
            securityInstructions = """
                    QUY ĐỊNH AN TOÀN BẢO MẬT MCP VÀ PHÂN QUYỀN (BẮT BUỘC TUÂN THỦ):
                    - Khi người dùng hỏi các câu hỏi quan trọng về:
                      + Hệ thống: máy chủ, backend, microservices, kiến trúc hệ thống, cổng mạng, Docker, mã nguồn, cấu hình env, secret key.
                      + Cơ sở dữ liệu (DB): MySQL, Aiven, tên bảng, cấu trúc schema, câu lệnh SQL, kết nối DB.
                      + Người dùng (User): danh sách tài khoản, mật khẩu, hash, email người khác, số điện thoại, thông tin KYC cá nhân, quyền admin.
                    -> BẠN PHẢI TỪ CHỐI VÀ TRẢ LỜI ĐÚNG:
                    "Tôi không có đủ thẩm quyền để trả lời câu hỏi này theo quy định an toàn hệ thống (MCP Policy). Tôi chỉ có thể hỗ trợ tư vấn các sản phẩm khóa học và giải đáp thông tin học tập trên LearnHub."
                    - QUY ĐỊNH XUẤT EXCEL: Học viên TUYỆT ĐỐI KHÔNG được xuất file Excel. Nếu học viên yêu cầu xuất file Excel, từ chối và giải thích tính năng xuất Excel chỉ dành cho Giảng viên và Quản trị viên.
                    - Khi người dùng hỏi về sản phẩm, khóa học: Hãy đưa ra một số sản phẩm phù hợp, trò chuyện tư vấn nhiệt tình, trả lời đúng trọng tâm câu hỏi.
                    """;
        } else {
            securityInstructions = """
                    HƯỚNG DẪN QUẢN TRỊ VIÊN:
                    - Khi admin ra lệnh mở chức năng:
                      + Quản lý tài khoản: [[NAV:/admin/users]]
                      + Duyệt khóa học: [[NAV:/admin/courses]]
                      + Doanh thu sàn: [[NAV:/admin/revenue]]
                      + Phân tích: [[NAV:/admin/analytics]]
                      + Coupon sàn: [[NAV:/admin/coupons]]
                      + Báo cáo Excel: [[NAV:/admin/reports]]
                      + Bàn vận hành & KYC: [[NAV:/admin/desk]]
                      + Tổng quan: [[NAV:/admin]]
                    Trả lời ngắn gọn xác nhận đã mở chức năng rồi xuống dòng ghi đúng mã [[NAV:<đường-dẫn>]].
                    """;
        }

        return """
                Bạn là trợ lý AI của LearnHub, sàn bán khóa học trực tuyến.
                Trả lời bằng văn bản rõ ràng, lịch sự. Mặc định tiếng Việt.
                %s
                Ưu tiên khối Số liệu lúc hỏi nếu được hỏi số liệu vận hành.
                Khi người dùng muốn xuất Excel:
                - Quản trị viên (ADMIN): file Excel quản trị sàn riêng biệt [[EXPORT:admin_report]] hoặc [[EXPORT:revenue]] hoặc [[EXPORT:users]] hoặc [[EXPORT:courses]];
                - Giảng viên (INSTRUCTOR): file Excel thu nhập studio riêng biệt [[EXPORT:instructor_report]] hoặc [[EXPORT:payout]] hoặc [[EXPORT:courses]] hoặc [[EXPORT:coupons]];
                - Học viên (STUDENT/khách): TUYỆT ĐỐI KHÔNG xuất Excel, từ chối rõ ràng và giải thích quyền hạn.
                Người đang hỏi là %s.
                Số liệu lúc hỏi:
                %s
                Thông tin LearnHub:
                %s""".formatted(securityInstructions, who, briefing.isBlank() ? "Chưa gửi số liệu." : briefing, facts);
    }

    private static String keywordAnswer(String question, String role, List<HelpArticle> articles, String briefing) {
        // 1. Kiem tra quy dinh an toan MCP cho nguoi dung khong phai Admin
        if (!"ADMIN".equals(role) && isMcpRestricted(question)) {
            return "Tôi không có đủ thẩm quyền để trả lời câu hỏi này theo quy định an toàn hệ thống (MCP Policy). Tôi chỉ có thể hỗ trợ tư vấn các sản phẩm khóa học và giải đáp thông tin học tập trên LearnHub.";
        }

        // 2. Kiem tra lenh dieu huong cho Admin
        if ("ADMIN".equals(role)) {
            String nav = detectAdminNav(question);
            if (nav != null) {
                return nav;
            }
        }

        // 3. Kiem tra tu van san pham khoa hoc
        if (isProductInquiry(question)) {
            return consultProducts(question);
        }

        String folded = fold(question);
        Set<String> stop = Set.of("toi", "ban", "cua", "cho", "voi", "mot", "cac", "the", "and", "you",
                "for", "how", "what", "lam", "sao", "nao", "vao", "tren", "duoc", "khi", "this", "that");
        HelpArticle best = null;
        int bestScore = 0;
        for (HelpArticle article : articles) {
            String hay = fold(article.getTitle() + " " + article.getBody() + " " + article.getSlug().replace('-', ' '));
            int score = 0;
            for (String token : folded.split("[^a-z0-9]+")) {
                if (token.length() < 3 || stop.contains(token)) {
                    continue;
                }
                if (hay.contains(token)) {
                    score += token.length();
                }
            }
            if (score > bestScore) {
                bestScore = score;
                best = article;
            }
        }
        if (briefing != null && !briefing.isBlank()) {
            String q = fold(question);
            if (q.contains("excel") || q.contains("xlsx") || q.contains("xuat") || q.contains("bao cao") || q.contains("tai file")) {
                if ("ADMIN".equals(role)) {
                    String mark = q.contains("tai khoan") ? "[[EXPORT:users]]" : (q.contains("khoa") ? "[[EXPORT:courses]]" : (q.contains("doanh thu") ? "[[EXPORT:revenue]]" : "[[EXPORT:admin_report]]"));
                    return "Đây là số liệu quản trị sàn lúc bạn hỏi.\n" + briefing + "\n" + mark;
                } else if ("INSTRUCTOR".equals(role)) {
                    String mark = (q.contains("voucher") || q.contains("coupon")) ? "[[EXPORT:coupons]]" : (q.contains("khoa") ? "[[EXPORT:courses]]" : (q.contains("thuc linh") || q.contains("doanh thu") ? "[[EXPORT:payout]]" : "[[EXPORT:instructor_report]]"));
                    return "Đây là số liệu thu nhập giảng viên lúc bạn hỏi.\n" + briefing + "\n" + mark;
                } else {
                    return "Tính năng xuất báo cáo Excel chỉ dành cho Giảng viên và Quản trị viên hệ thống. Học viên không có quyền xuất file Excel. Bạn có thể theo dõi khóa học và đơn hàng trực tiếp trên giao diện website.";
                }
            }
            if (best == null || bestScore < 8) {
                return "Số liệu lúc bạn hỏi:\n" + briefing;
            }
        }
        if (best != null && bestScore >= 4) {
            return best.getBody();
        }
        return switch (role == null ? "" : role) {
            case "ADMIN" -> "Bạn đang dùng AI quản trị. Ra lệnh 'mở [chức năng]' (tài khoản, duyệt khóa, doanh thu, kyc, coupon, báo cáo...) để chuyển trang tự động. Hoặc hỏi doanh thu, coupon, bảo xuất file Excel báo cáo quản trị toàn sàn.";
            case "INSTRUCTOR" -> "Bạn đang dùng AI người bán. Hỏi doanh thu, thực lĩnh, voucher, hồ sơ nhận tiền, người mua đã nhắn, hoặc bảo xuất file Excel báo cáo thu nhập studio giảng viên.";
            case "ORG_ADMIN" -> "Bạn đang dùng AI người mua cho doanh nghiệp. Hỏi giỏ hàng, đơn, khóa đang học, chứng chỉ, hoặc cấp khóa nhân sự.";
            case "STUDENT" -> "Chào bạn! Mình là AI trợ lý của LearnHub. Bạn có thể hỏi mình tư vấn các sản phẩm khóa học, lộ trình học tập, xem giỏ hàng hoặc chính sách hoàn tiền.";
            default -> "Chào bạn! Mình là AI trợ lý của LearnHub. Bạn có thể hỏi mình tư vấn các sản phẩm khóa học, lộ trình học tập hoặc đăng nhập để quản lý tài khoản.";
        };
    }

    private static String fold(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    public AssistDtos.FeeDTO fee() {
        int extra = extraPercent.get();
        return new AssistDtos.FeeDTO(extra,
                "Khoa hoc bat AI assistant se cong them " + extra + "% vao phi nen tang.");
    }

    public AssistDtos.FeeDTO updateFee(int percent) {
        extraPercent.set(percent);
        return fee();
    }
}

@Component
class HelpSeeder implements ApplicationRunner {
    private final HelpArticleRepository articleRepository;

    HelpSeeder(HelpArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed("refund", "Hoàn tiền", "LearnHub hoàn tiền trong 7 ngày nếu bạn chưa hoàn thành quá 30% bài giảng.", "vi", "all");
        seed("coupon", "Mã giảm giá", "Nhập LEARNHUB20 ở giỏ hàng để giảm 20% (mã demo của sàn).", "vi", "all");
        seed("gift", "Mua tặng", "Ở trang thanh toán chọn Mua tặng và nhập email người nhận đã có tài khoản.", "vi", "all");
        seed("certificate", "Chứng chỉ", "Hoàn thành khóa học rồi bấm Xuất chứng chỉ trong mục Chứng chỉ.", "vi", "all");
        seed("refund", "Refunds", "LearnHub refunds within 7 days if you completed under 30% of lectures.", "en", "all");
        seed("coupon", "Coupons", "Enter LEARNHUB20 at checkout for 20% off (platform demo code).", "en", "all");
        seed("gift", "Gifting", "At checkout, choose Buy as a gift and enter the recipient email.", "en", "all");
        seed("certificate", "Certificates", "Finish a course, then issue a certificate from Certificates.", "en", "all");

        seed("buyer-search", "Tìm khóa và giảng viên", "Ô tìm nhận cả tên khóa lẫn tên giảng viên. Khớp giảng viên thì trang hiện tên, giới thiệu và toàn bộ khóa của người đó.", "vi", "buyer");
        seed("buyer-message", "Nhắn giảng viên", "Trên trang giảng viên hoặc trang khóa, bấm Nhắn giảng viên. Cần đăng nhập. Khung tin nhắn mở ở góc trái.", "vi", "buyer");
        seed("buyer-favorite", "Yêu thích", "Bấm trái tim trên thẻ khóa hoặc trong trang khóa. Danh sách đã lưu nằm ở mục Yêu thích.", "vi", "buyer");
        seed("buyer-pay", "Thanh toán", "Ở giỏ hàng chọn Thanh toán thường để ghi đơn và mở khóa ngay, hoặc MoMo để sang cổng MoMo. Thanh toán lại vẫn dùng đơn cũ.", "vi", "buyer");
        seed("buyer-orders", "Đơn mua", "Hỏi AI Care để biết đơn gần đây, tổng tiền và mã giảm. Mục Đơn mua xem toàn bộ danh sách đơn hàng đã mua.", "vi", "buyer");
        seed("buyer-no-excel", "Quy định xuất Excel", "Học viên không có quyền xuất file Excel. Tính năng xuất báo cáo Excel chỉ dành riêng cho Giảng viên và Quản trị viên hệ thống.", "vi", "buyer");
        seed("buyer-live", "Số liệu học", "Hỏi AI Care giỏ hàng còn gì, đang học khóa nào, tiến độ, chứng chỉ. Không cần được chỉ đường nếu số liệu đã có.", "vi", "buyer");
        seed("buyer-learn", "Vào học", "Sau khi đơn đã thanh toán, mở Khóa học của tôi để vào bài giảng.", "vi", "buyer");
        seed("buyer-account", "Tài khoản học viên", "Trong Tài khoản đổi email, số điện thoại và mật khẩu. Quên mật khẩu thì dùng link ở trang đăng nhập.", "vi", "buyer");
        seed("buyer-admin-chat", "Nhắn quản trị", "Bấm Tin nhắn ở góc trái để nhắn admin LearnHub. AI Care ở góc phải chỉ trả lời hướng dẫn.", "vi", "buyer");
        seed("buyer-review", "Đánh giá khóa", "Trên trang khóa đã mua, gửi số sao và nhận xét. Giảng viên có thể trả lời trong Kênh bán.", "vi", "buyer");

        seed("seller-studio", "Tạo khóa trong Studio", "Người bán vào Studio để tạo khóa và thêm bài giảng dạng video, văn bản hoặc slide.", "vi", "seller");
        seed("seller-channel", "Kênh bán", "Kênh bán hiện người đã bấm Nhắn giảng viên. Bấm Nhắn để trả lời học viên đó.", "vi", "seller");
        seed("seller-price", "Sửa giá", "Trong Kênh bán sửa giá khóa đang bán. Giá gợi ý là trung bình các khóa cùng danh mục.", "vi", "seller");
        seed("seller-voucher", "Voucher của shop", "Trong Kênh bán tạo mã giảm riêng của shop, gồm phần trăm và số lượng mã.", "vi", "seller");
        seed("seller-kyc", "Nhận tiền", "Gửi hồ sơ xác minh trong Kênh bán. Tiền về ngân hàng sau khi hồ sơ được duyệt. Hỏi AI Care để biết trạng thái hồ sơ, doanh thu và thực lĩnh.", "vi", "seller");
        seed("seller-live", "Số liệu bán", "Hỏi AI Care doanh thu, phí sàn, thực lĩnh, số suất đã bán, voucher shop. Giảng viên có thể yêu cầu AI xuất file Excel báo cáo thu nhập cá nhân riêng.", "vi", "seller");
        seed("seller-review", "Trả lời đánh giá", "Trong Kênh bán chọn nhận xét của học viên và gửi câu trả lời.", "vi", "seller");
        seed("seller-ads", "Gói quảng cáo", "Kênh bán có gói quảng cáo theo suất. Khi hết suất, nút đăng ký không bấm được nữa.", "vi", "seller");

        seed("admin-users", "Quản lý tài khoản", "Mục Tài khoản tìm người dùng, khóa hoặc mở khóa, và gửi email nêu lý do.", "vi", "admin");
        seed("admin-courses", "Duyệt khóa học", "Mục Khóa học xem khóa chờ duyệt, rồi duyệt, từ chối, ẩn hoặc xóa.", "vi", "admin");
        seed("admin-revenue", "Doanh thu sàn", "AI Care đọc doanh thu, phí sàn, phần giảng viên, số đơn và khóa đã bán rồi trả số ngay. Bảo xuất Excel thì file tải về máy.", "vi", "admin");
        seed("admin-coupon", "Coupon sàn", "AI Care đếm coupon sàn đang có, phần trăm và lượt đã dùng. Tạo mã mới vẫn ở mục Coupon sàn.", "vi", "admin");
        seed("admin-message", "Nhắn người dùng", "Mở Tin nhắn rồi gõ tên, tài khoản hoặc email. Chỉ người khớp hiện ra. Bấm tên để bắt đầu cuộc trò chuyện.", "vi", "admin");
        seed("admin-desk", "Vận hành", "Mục Vận hành xử lý đơn, duyệt hồ sơ nhận tiền và xem dòng tiền.", "vi", "admin");
        seed("admin-report", "Báo cáo Excel", "Trong AI Care, quản trị viên có thể yêu cầu AI xuất file Excel báo cáo quản trị toàn sàn (doanh thu sàn, tài khoản người dùng, danh mục khóa học).", "vi", "admin");
        seed("admin-live", "Hỏi số liệu", "Hỏi doanh thu tháng này, có bao nhiêu coupon, khóa chờ duyệt, tài khoản đang khóa. Trợ lý lấy số lúc hỏi, không chỉ đường bấm menu.", "vi", "admin");
        seed("admin-security", "Khóa đăng nhập", "Sai mật khẩu 5 lần trong 10 phút thì địa chỉ IP bị khóa đăng nhập 15 phút.", "vi", "admin");
        seed("admin-cmd-nav", "Lệnh mở chức năng quản trị", "Khi admin ra lệnh: 'mở tài khoản' -> /admin/users; 'mở duyệt khóa' -> /admin/courses; 'mở doanh thu' -> /admin/revenue; 'mở phân tích' -> /admin/analytics; 'mở coupon' -> /admin/coupons; 'mở báo cáo' -> /admin/reports; 'mở vận hành' / 'mở kyc' -> /admin/desk; 'mở tổng quan' -> /admin. Hệ thống tự động chuyển trang.", "vi", "admin");

        seed("mcp-policy-system", "Chính sách an toàn MCP - Hệ thống", "Theo quy định an toàn hệ thống (MCP Policy), AI không được phép tiết lộ thông tin kỹ thuật máy chủ, kiến trúc backend, cổng kết nối hay mã nguồn cho người dùng không có thẩm quyền.", "vi", "buyer");
        seed("mcp-policy-db", "Chính sách an toàn MCP - Cơ sở dữ liệu", "Theo quy định an toàn hệ thống (MCP Policy), thông tin về cơ sở dữ liệu, bảng dữ liệu, kết nối DB và cấu trúc lưu trữ nội bộ là tuyệt mật và không được cung cấp.", "vi", "buyer");
        seed("mcp-policy-user", "Chính sách an toàn MCP - Dữ liệu người dùng", "Theo quy định an toàn hệ thống (MCP Policy), AI không có thẩm quyền tiết lộ thông tin cá nhân, email, mật khẩu hay tài khoản của người dùng khác.", "vi", "buyer");

        seed("products-catalog", "Sản phẩm khóa học LearnHub", "LearnHub cung cấp các sản phẩm khóa học chất lượng cao: Java cơ bản (499k), Spring Boot thực hành (890k), IELTS Writing 6.5 (790k), Thiết kế giao diện UI/UX (650k), Excel công việc (350k), SQL truy vấn (540k). Nhập LEARNHUB20 để giảm 20%.", "vi", "all");
        seed("products-programming", "Khóa học Lập trình", "Các khóa lập trình: Java cơ bản cho người mới (499.000đ của Mai Lan), Spring Boot thực hành chuyên sâu (890.000đ của Trần Khoa), SQL truy vấn dữ liệu (540.000đ của Lê Hà). Phù hợp cho người muốn học bài bản đi làm.", "vi", "buyer");
        seed("products-language", "Khóa học Ngoại ngữ", "Khóa học IELTS Writing 6.5 (790.000đ của Trần Khoa), Thuyết trình tự tin (420.000đ của Lê Hà). Luyện từ vựng học thuật, chữa bài chi tiết và kỹ năng giao tiếp thực tế.", "vi", "buyer");
        seed("products-design-office", "Khóa học Thiết kế và Tin học", "Khóa Thiết kế giao diện căn bản UI/UX (650.000đ của Lê Hà), Excel cho công việc (350.000đ của Mai Lan). Áp dụng ngay vào thực tế công việc.", "vi", "buyer");

        seed("buyer-search", "Find a course or instructor", "Search matches course titles and instructor names. An instructor match shows their name, headline, and every course they teach.", "en", "buyer");
        seed("buyer-message", "Message an instructor", "On the instructor card or the course page, choose Message instructor. Sign in first. The chat opens at the lower left.", "en", "buyer");
        seed("buyer-favorite", "Favorites", "Use the heart on a course card or inside the course. Saved courses are listed under Favorites.", "en", "buyer");
        seed("buyer-pay", "Checkout", "In the cart, Standard payment records the order and opens the course. MoMo sends you to MoMo. Paying again stays on the same order.", "en", "buyer");
        seed("buyer-orders", "Orders", "Orders lists purchases and whether each payment finished.", "en", "buyer");
        seed("buyer-learn", "Start learning", "After the order is paid, open My courses to enter the lectures.", "en", "buyer");
        seed("buyer-account", "Learner account", "Account changes email, phone, and password. Forgot password starts from the sign-in page.", "en", "buyer");
        seed("buyer-admin-chat", "Message admin", "Messages at the lower left reaches a LearnHub admin. AI Care at the lower right only gives guidance.", "en", "buyer");
        seed("buyer-review", "Course review", "On a course you own, send a star rating and a comment. The instructor can reply from Sell.", "en", "buyer");
        seed("seller-studio", "Create a course", "Sellers use Studio to create a course and add video, text, or slide lectures.", "en", "seller");
        seed("seller-channel", "Sell channel", "Sell lists people who chose Message instructor. Choose Message to reply.", "en", "seller");
        seed("seller-price", "Change a price", "Sell edits the price of a live course. The suggestion is the average of courses in the same category.", "en", "seller");
        seed("seller-voucher", "Shop voucher", "Sell creates a shop code with a percent off and a limited quantity.", "en", "seller");
        seed("seller-kyc", "Get paid", "Submit verification in Sell. Money reaches the bank account only after the profile is approved.", "en", "seller");
        seed("seller-review", "Reply to a review", "In Sell, pick a learner comment and send a reply.", "en", "seller");
        seed("seller-ads", "Ad packages", "Sell offers ad packages by slot. When the slots are full, the register button turns off.", "en", "seller");
        seed("admin-users", "Accounts", "Accounts finds a user, locks or unlocks them, and can email the reason.", "en", "admin");
        seed("admin-courses", "Review courses", "Courses shows pending courses, then approve, reject, hide, or delete.", "en", "admin");
        seed("admin-revenue", "Platform revenue", "Revenue shows paid orders, the platform fee, and the instructor share.", "en", "admin");
        seed("admin-coupon", "Platform coupons", "Coupons creates a platform code. That is separate from a shop voucher.", "en", "admin");
        seed("admin-message", "Message a user", "Open Messages and type a name, username, or email. Only matches stay in the list. Choose a name to start the chat.", "en", "admin");
        seed("admin-desk", "Operations desk", "Desk handles orders, payout verification, and cash movement.", "en", "admin");
        seed("admin-report", "Excel reports", "Excel reports exports users and operating figures.", "en", "admin");
        seed("admin-security", "Login lock", "Five wrong passwords within 10 minutes lock that IP from signing in for 15 minutes.", "en", "admin");
    }

    private void seed(String slug, String title, String body, String locale, String audience) {
        HelpArticle article = articleRepository.findBySlugAndLocale(slug, locale).orElseGet(HelpArticle::new);
        article.setSlug(slug);
        article.setTitle(title);
        article.setBody(body);
        article.setLocale(locale);
        article.setAudience(audience);
        articleRepository.save(article);
    }
}
