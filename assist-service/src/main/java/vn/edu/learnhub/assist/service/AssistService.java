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

    private static String systemPrompt(String role, List<HelpArticle> articles, String briefing) {
        String who = switch (role == null ? "" : role) {
            case "ADMIN" -> "quản trị viên. Trả số liệu vận hành thật: doanh thu, phí sàn, phần giảng viên, đơn, khóa đã bán, coupon, tài khoản, khóa chờ duyệt. Xuất Excel khi được yêu cầu.";
            case "INSTRUCTOR" -> "người bán. Trả số liệu thật: doanh thu, phí sàn, thực lĩnh, khóa của họ, voucher, hồ sơ nhận tiền, người mua đã nhắn. Xuất Excel khi được yêu cầu.";
            case "ORG_ADMIN" -> "người mua cho doanh nghiệp. Trả số liệu giỏ hàng, đơn, khóa đang học, chứng chỉ, và nhắc trang Doanh nghiệp khi hỏi cấp khóa nhân sự.";
            case "STUDENT" -> "người mua. Trả số liệu giỏ hàng, đơn mua, khóa đang học, chứng chỉ, yêu thích. Xuất Excel danh sách đó khi được yêu cầu.";
            default -> "khách chưa đăng nhập. Trả lời như người mua và nhắc đăng nhập trước khi mua, học hoặc nhắn tin.";
        };
        StringBuilder facts = new StringBuilder();
        for (HelpArticle article : articles) {
            facts.append("- ").append(article.getTitle()).append(": ").append(article.getBody()).append('\n');
        }
        return """
                Bạn là trợ lý của LearnHub, sàn bán khóa học trực tuyến.
                Trả lời bằng văn bản thường, không markdown. Mặc định tiếng Việt.
                Ưu tiên khối Số liệu lúc hỏi. Đọc số trong đó và trả lời thẳng. Không bảo người dùng bấm vào menu nếu số đã có.
                Không bịa số. Mục nào ghi chưa lấy được thì nói dịch vụ đó chưa chạy.
                Báo cáo được dài tới 8 câu, có thể xuống dòng.
                Khi người dùng muốn xuất Excel hoặc file, trả lời đã chuẩn bị file rồi xuống dòng cuối đúng một mã:
                quản trị [[EXPORT:revenue]] hoặc [[EXPORT:users]] hoặc [[EXPORT:courses]];
                người bán [[EXPORT:payout]] hoặc [[EXPORT:courses]] hoặc [[EXPORT:coupons]];
                người mua [[EXPORT:orders]] hoặc [[EXPORT:courses]] hoặc [[EXPORT:certificates]].
                Không hướng dẫn thao tác của vai trò khác.
                Người đang hỏi là %s.
                Số liệu lúc hỏi:
                %s
                Thông tin LearnHub:
                %s""".formatted(who, briefing.isBlank() ? "Chưa gửi số liệu." : briefing, facts);
    }

    private static String keywordAnswer(String question, String role, List<HelpArticle> articles, String briefing) {
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
            if (q.contains("excel") || q.contains("xlsx") || q.contains("xuat") || q.contains("bao cao")) {
                String mark = switch (role == null ? "" : role) {
                    case "ADMIN" -> (q.contains("tai khoan") ? "[[EXPORT:users]]" : q.contains("khoa") ? "[[EXPORT:courses]]" : "[[EXPORT:revenue]]");
                    case "INSTRUCTOR" -> (q.contains("voucher") || q.contains("coupon") ? "[[EXPORT:coupons]]" : "[[EXPORT:payout]]");
                    default -> (q.contains("chung chi") ? "[[EXPORT:certificates]]" : "[[EXPORT:orders]]");
                };
                return "Đây là số liệu lúc bạn hỏi.\n" + briefing + "\n" + mark;
            }
            if (best == null || bestScore < 8) {
                return "Số liệu lúc bạn hỏi:\n" + briefing;
            }
        }
        if (best != null && bestScore >= 4) {
            return best.getBody();
        }
        return switch (role == null ? "" : role) {
            case "ADMIN" -> "Bạn đang dùng AI quản trị. Hỏi doanh thu, coupon, đơn tháng này, khóa chờ duyệt, tài khoản đang khóa, hoặc bảo xuất Excel.";
            case "INSTRUCTOR" -> "Bạn đang dùng AI người bán. Hỏi doanh thu, thực lĩnh, voucher, hồ sơ nhận tiền, người mua đã nhắn, hoặc bảo xuất Excel.";
            case "ORG_ADMIN" -> "Bạn đang dùng AI người mua cho doanh nghiệp. Hỏi giỏ hàng, đơn, khóa đang học, chứng chỉ, hoặc cấp khóa nhân sự.";
            case "STUDENT" -> "Bạn đang dùng AI người mua. Hỏi giỏ hàng, đơn mua, khóa đang học, chứng chỉ, hoặc bảo xuất Excel.";
            default -> "Bạn chưa đăng nhập nên AI đang trả lời như người mua. Đăng nhập để xem số liệu đúng vai trò.";
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
        seed("business", "Gói doanh nghiệp", "Đăng ký dùng thử ở trang Doanh nghiệp. Quản trị doanh nghiệp cấp khóa cho nhân sự.", "vi", "all");
        seed("refund", "Refunds", "LearnHub refunds within 7 days if you completed under 30% of lectures.", "en", "all");
        seed("coupon", "Coupons", "Enter LEARNHUB20 at checkout for 20% off (platform demo code).", "en", "all");
        seed("gift", "Gifting", "At checkout, choose Buy as a gift and enter the recipient email.", "en", "all");
        seed("certificate", "Certificates", "Finish a course, then issue a certificate from Certificates.", "en", "all");
        seed("business", "Business plans", "Request a demo on the Business page. An organization admin assigns courses to staff.", "en", "all");

        seed("buyer-search", "Tìm khóa và giảng viên", "Ô tìm nhận cả tên khóa lẫn tên giảng viên. Khớp giảng viên thì trang hiện tên, giới thiệu và toàn bộ khóa của người đó.", "vi", "buyer");
        seed("buyer-message", "Nhắn giảng viên", "Trên trang giảng viên hoặc trang khóa, bấm Nhắn giảng viên. Cần đăng nhập. Khung tin nhắn mở ở góc trái.", "vi", "buyer");
        seed("buyer-favorite", "Yêu thích", "Bấm trái tim trên thẻ khóa hoặc trong trang khóa. Danh sách đã lưu nằm ở mục Yêu thích.", "vi", "buyer");
        seed("buyer-pay", "Thanh toán", "Ở giỏ hàng chọn Thanh toán thường để ghi đơn và mở khóa ngay, hoặc MoMo để sang cổng MoMo. Thanh toán lại vẫn dùng đơn cũ.", "vi", "buyer");
        seed("buyer-orders", "Đơn mua", "Hỏi AI Care để biết đơn gần đây, tổng tiền và mã giảm. Mục Đơn mua vẫn xem đủ danh sách. Bảo xuất Excel thì file tải về.", "vi", "buyer");
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
        seed("seller-live", "Số liệu bán", "Hỏi AI Care doanh thu, phí sàn, thực lĩnh, số suất đã bán, voucher shop. Bảo xuất Excel thì file tải về.", "vi", "seller");
        seed("seller-review", "Trả lời đánh giá", "Trong Kênh bán chọn nhận xét của học viên và gửi câu trả lời.", "vi", "seller");
        seed("seller-ads", "Gói quảng cáo", "Kênh bán có gói quảng cáo theo suất. Khi hết suất, nút đăng ký không bấm được nữa.", "vi", "seller");

        seed("admin-users", "Quản lý tài khoản", "Mục Tài khoản tìm người dùng, khóa hoặc mở khóa, và gửi email nêu lý do.", "vi", "admin");
        seed("admin-courses", "Duyệt khóa học", "Mục Khóa học xem khóa chờ duyệt, rồi duyệt, từ chối, ẩn hoặc xóa.", "vi", "admin");
        seed("admin-revenue", "Doanh thu sàn", "AI Care đọc doanh thu, phí sàn, phần giảng viên, số đơn và khóa đã bán rồi trả số ngay. Bảo xuất Excel thì file tải về máy.", "vi", "admin");
        seed("admin-coupon", "Coupon sàn", "AI Care đếm coupon sàn đang có, phần trăm và lượt đã dùng. Tạo mã mới vẫn ở mục Coupon sàn.", "vi", "admin");
        seed("admin-message", "Nhắn người dùng", "Mở Tin nhắn rồi gõ tên, tài khoản hoặc email. Chỉ người khớp hiện ra. Bấm tên để bắt đầu cuộc trò chuyện.", "vi", "admin");
        seed("admin-desk", "Vận hành", "Mục Vận hành xử lý đơn, duyệt hồ sơ nhận tiền và xem dòng tiền.", "vi", "admin");
        seed("admin-report", "Báo cáo Excel", "Trong AI Care, bảo xuất Excel doanh thu, tài khoản hoặc khóa học. File tải về máy, không cần vào trang Báo cáo.", "vi", "admin");
        seed("admin-live", "Hỏi số liệu", "Hỏi doanh thu tháng này, có bao nhiêu coupon, khóa chờ duyệt, tài khoản đang khóa. Trợ lý lấy số lúc hỏi, không chỉ đường bấm menu.", "vi", "admin");
        seed("admin-security", "Khóa đăng nhập", "Sai mật khẩu 5 lần trong 10 phút thì địa chỉ IP bị khóa đăng nhập 15 phút.", "vi", "admin");
        seed("admin-business", "Gói Business", "Mục Gói Business xem doanh nghiệp đăng ký và việc cấp khóa cho nhân sự.", "vi", "admin");

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
        seed("admin-business", "Business plans", "Business shows organizations that signed up and how they assign courses to staff.", "en", "admin");
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
