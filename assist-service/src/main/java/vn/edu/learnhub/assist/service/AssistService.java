package vn.edu.learnhub.assist.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import vn.edu.learnhub.assist.dto.AssistDtos;
import vn.edu.learnhub.assist.entity.AssistChat;
import vn.edu.learnhub.assist.entity.HelpArticle;
import vn.edu.learnhub.assist.repository.AssistChatRepository;
import vn.edu.learnhub.assist.repository.HelpArticleRepository;
import vn.edu.learnhub.platform.client.ServiceClient;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.AuthUser;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class AssistService {
    private static final Logger log = LoggerFactory.getLogger(AssistService.class);
    private static final int MAX_QUESTION = 800;

    private final HelpArticleRepository articleRepository;
    private final AssistChatRepository chatRepository;
    private final LlmClient llmClient;
    private final ServiceClient serviceClient;
    private final RestClient reportClient;
    private final String userModel;
    private final String adminModel;
    private final String catalogUrl;
    private final String identityUrl;
    private final String commerceUrl;
    private final String learningUrl;
    private final String sitePhone;
    private final String siteFounded;
    private final String siteEmail;

    public AssistService(HelpArticleRepository articleRepository,
                         AssistChatRepository chatRepository,
                         LlmClient llmClient,
                         ServiceClient serviceClient,
                         @Value("${assist.user-model}") String userModel,
                         @Value("${assist.admin-model}") String adminModel,
                         @Value("${assist.catalog-url}") String catalogUrl,
                         @Value("${assist.identity-url}") String identityUrl,
                         @Value("${assist.commerce-url}") String commerceUrl,
                         @Value("${assist.learning-url}") String learningUrl,
                         @Value("${assist.site.phone:}") String sitePhone,
                         @Value("${assist.site.founded-year:}") String siteFounded,
                         @Value("${assist.site.email:}") String siteEmail) {
        this.articleRepository = articleRepository;
        this.chatRepository = chatRepository;
        this.llmClient = llmClient;
        this.serviceClient = serviceClient;
        this.userModel = userModel;
        this.adminModel = adminModel;
        this.catalogUrl = catalogUrl;
        this.identityUrl = identityUrl;
        this.commerceUrl = commerceUrl;
        this.learningUrl = learningUrl;
        this.sitePhone = blankToUnset(sitePhone);
        this.siteFounded = blankToUnset(siteFounded);
        this.siteEmail = blankToUnset(siteEmail);
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(8));
        this.reportClient = RestClient.builder().requestFactory(factory).build();
    }

    public List<AssistDtos.HelpDTO> help(String locale) {
        String loc = locale == null || locale.isBlank() ? "vi" : locale;
        return articleRepository.findByLocaleOrderByTitleAsc(loc).stream()
                .map(a -> new AssistDtos.HelpDTO(a.getId(), a.getSlug(), a.getTitle(), a.getBody(), a.getLocale()))
                .toList();
    }

    public AssistDtos.ChatDTO guestChat(AssistDtos.ChatRequest request) {
        String question = cleanQuestion(request.question());
        String answer = llmClient.complete(userModel, guestPrompt(), question);
        return new AssistDtos.ChatDTO(null, null, question, answer, Instant.now());
    }

    public AssistDtos.ChatDTO chat(AuthUser user, AssistDtos.ChatRequest request) {
        String question = cleanQuestion(request.question());
        String answer = llmClient.complete(userModel, learnerPrompt(), question);
        return save(user.userId(), request.courseId(), question, answer);
    }

    public AssistDtos.ChatDTO adminChat(AuthUser user, AssistDtos.ChatRequest request) {
        if (!user.isAdmin()) {
            throw BusinessException.forbidden("Chi tai khoan admin moi xem bao cao");
        }
        String question = cleanQuestion(request.question());
        String answer = llmClient.complete(adminModel, adminPrompt(), question);
        return save(user.userId(), request.courseId(), question, answer);
    }

    private AssistDtos.ChatDTO save(Long userId, Long courseId, String question, String answer) {
        AssistChat chat = new AssistChat();
        chat.setUserId(userId);
        chat.setCourseId(courseId);
        chat.setQuestion(question);
        chat.setAnswer(answer);
        chat = chatRepository.save(chat);
        return new AssistDtos.ChatDTO(chat.getId(), chat.getCourseId(), chat.getQuestion(),
                chat.getAnswer(), chat.getCreatedAt());
    }

    private String guestPrompt() {
        return """
                Ban la tro ly dang nhap cua LearnHub. Tra loi bang tieng Viet co dau, ngan, de hieu.
                Chi duoc huong dan dang nhap va dang ky tai khoan. Khong tu van khoa hoc, gia, doanh thu, hoan tien, chung chi.
                Neu cau hoi nam ngoai dang nhap/dang ky, tu choi ngan va moi hoi lai dung hai viec do.
                Loi chao van nam trong pham vi: chao lai roi noi minh chi huong dan dang nhap va dang ky.
                Cach dang nhap:
                - Mo trang Dang nhap.
                - Nhap ten dang nhap hoac email, roi mat khau.
                - Bam nut Dang nhap. Dung thi vao trang chu. Tai khoan admin vao cong quan tri.
                - Sai tai khoan hoac mat khau: hien "Sai tai khoan hoac mat khau".
                - Tai khoan bi khoa: hien ly do va bao lien he ho tro.
                Cach dang ky:
                - Bam Tham gia LearnHub hoac link Dang ky duoi form dang nhap.
                - Dien ten dang nhap (3 den 60 ky tu, chi chu, so, dau cham, gach duoi, gach ngang).
                - Dien email dung dinh dang, ho ten, mat khau tu 6 den 72 ky tu.
                - Chon vai tro Hoc vien hoac Giang vien. Khong tu dang ky lam admin.
                - Bam Dang ky. Trung ten dang nhap hoac email se bao loi, can doi ten hoac email khac.
                - Dang ky xong he thong dang nhap luon va dua ve trang chu.
                Khong bia mat khau mau, khong doi mat khau ho giup. LearnHub chua co tu doi mat khau tren form nay.
                """;
    }

    private String learnerPrompt() {
        return """
                Ban la tro ly LearnHub cho nguoi hoc. Tra loi bang tieng Viet co dau, ngan gon, than thien.
                Chi duoc tu van khoa hoc va thong tin cong khai cua trang web.
                Khong tiet lo doanh thu, phi san, so hoc vien, so giang vien, so lieu admin.
                Khong bia so dien thoai, email hay nam thanh lap neu du lieu ghi "chua cong bo".
                Neu cau hoi nam ngoai pham vi, tu choi ngan va moi hoi ve khoa hoc hoac cach hoc.
                Thong tin trang:
                - Ten: LearnHub, nen tang hoc truc tuyen.
                - Phi san 30%, giang vien nhan 70%.
                - Hoan tien trong 7 ngay neu chua hoan thanh qua 30% bai giang.
                - Ma giam gia demo LEARNHUB20 giam 20% o gio hang.
                - Chung chi: hoan thanh khoa roi vao muc Chung chi.
                - Dien thoai: """ + sitePhone + """
                - Email: """ + siteEmail + """
                - Nam thanh lap: """ + siteFounded + """
                Bai tro giup:
                """ + helpBrief("vi") + """
                7 khoa duoc xem nhieu nhat (dung danh sach nay khi hoi khoa pho bien / truy cap nhieu):
                """ + courseList(catalogUrl + "/catalog/most-viewed?limit=7") + """
                Them mot so khoa dang ban:
                """ + courseList(catalogUrl + "/catalog/courses?size=16");
    }

    private String adminPrompt() {
        return """
                Ban la tro ly bao cao cho admin LearnHub. Tra loi bang tieng Viet co dau.
                Chi duoc dung cac so lieu trong khoi du lieu ben duoi. Khong bia so.
                Neu mot muc ghi loi hoac thieu, noi ro la chua lay duoc muc do, khong uoc luong.
                Pham vi: doanh thu, phi san, thuc linh giang vien, don hang, so hoc vien, so giang vien, so khoa, tien do hoc.
                Neu hoi viec ngoai bao cao, tu choi ngan.
                Du lieu:
                """ + adminFacts();
    }

    private String helpBrief(String locale) {
        List<HelpArticle> articles = articleRepository.findByLocaleOrderByTitleAsc(locale);
        if (articles.isEmpty()) {
            return "(chua co bai tro giup)";
        }
        StringBuilder out = new StringBuilder();
        for (HelpArticle article : articles) {
            out.append("- ").append(article.getTitle()).append(": ").append(article.getBody()).append('\n');
        }
        return out.toString();
    }

    private String courseList(String url) {
        try {
            JsonNode root = serviceClient.get("catalog", url, JsonNode.class);
            JsonNode data = root == null ? null : root.path("data");
            if (data == null || !data.isArray() || data.isEmpty()) {
                return "(chua tai duoc danh sach khoa)";
            }
            StringBuilder out = new StringBuilder();
            int count = 0;
            for (JsonNode course : data) {
                if (count++ >= 16) {
                    break;
                }
                out.append("- ").append(course.path("title").asText("Khoa hoc"))
                        .append(" | ").append(course.path("categoryName").asText(""))
                        .append(" | ").append(course.path("price").asText("0")).append(" VND")
                        .append(" | ").append(course.path("enrollmentCount").asText("0")).append(" hoc vien")
                        .append(" | ").append(course.path("ratingAvg").asText("0")).append(" sao")
                        .append('\n');
            }
            return out.toString();
        } catch (Exception ex) {
            log.warn("Khong tai duoc khoa hoc cho tro ly {}: {}", url, ex.getMessage());
            return "(chua tai duoc danh sach khoa)";
        }
    }

    private String adminFacts() {
        String users = authorizedJson(identityUrl + "/users/admin/stats");
        String commerce = authorizedJson(commerceUrl + "/commerce/admin/analytics");
        String catalog = authorizedJson(catalogUrl + "/catalog/admin/stats");
        String learning = internalJson(learningUrl + "/internal/platform-stats");
        return "Tai khoan: " + users
                + "\nThuong mai: " + commerce
                + "\nKhoa hoc: " + catalog
                + "\nTien do hoc: " + learning;
    }

    private String authorizedJson(String url) {
        String authorization = currentAuthorization();
        if (authorization == null) {
            return "khong co token admin";
        }
        try {
            String body = reportClient.get()
                    .uri(url)
                    .header("Authorization", authorization)
                    .retrieve()
                    .body(String.class);
            return body == null || body.isBlank() ? "trong" : trim(body, 2500);
        } catch (Exception ex) {
            log.warn("Khong lay duoc bao cao {}: {}", url, ex.getMessage());
            return "khong lay duoc";
        }
    }

    private String internalJson(String url) {
        try {
            JsonNode node = serviceClient.get("learning", url, JsonNode.class);
            return node == null ? "khong lay duoc" : trim(node.toString(), 800);
        } catch (Exception ex) {
            log.warn("Khong lay duoc tien do: {}", ex.getMessage());
            return "khong lay duoc";
        }
    }

    private String currentAuthorization() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) {
            return null;
        }
        String header = attrs.getRequest().getHeader("Authorization");
        return header == null || header.isBlank() ? null : header;
    }

    private String cleanQuestion(String question) {
        String text = question == null ? "" : question.trim();
        if (text.length() > MAX_QUESTION) {
            return text.substring(0, MAX_QUESTION);
        }
        return text;
    }

    private static String blankToUnset(String value) {
        return value == null || value.isBlank() ? "chua cong bo" : value.trim();
    }

    private static String trim(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
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
        seed("refund", "Hoàn tiền", "LearnHub hoàn tiền trong 7 ngày nếu bạn chưa hoàn thành quá 30% bài giảng.", "vi");
        seed("coupon", "Mã giảm giá", "Nhập LEARNHUB20 ở giỏ hàng để giảm 20% (mã demo của sàn).", "vi");
        seed("gift", "Mua tặng", "Ở trang thanh toán chọn Mua tặng và nhập email người nhận đã có tài khoản.", "vi");
        seed("certificate", "Chứng chỉ", "Hoàn thành khóa học rồi bấm Xuất chứng chỉ trong mục Chứng chỉ.", "vi");
        seed("business", "Gói doanh nghiệp", "Đăng ký dùng thử ở trang Doanh nghiệp. ORG_ADMIN cấp khóa cho nhân sự.", "vi");
        seed("refund", "Refunds", "LearnHub refunds within 7 days if you completed under 30% of lectures.", "en");
        seed("coupon", "Coupons", "Enter LEARNHUB20 at checkout for 20% off (platform demo code).", "en");
        seed("gift", "Gifting", "At checkout, choose Buy as a gift and enter the recipient email.", "en");
        seed("certificate", "Certificates", "Finish a course, then issue a certificate from Certificates.", "en");
        seed("business", "Business plans", "Request a demo on the Business page. ORG_ADMIN assigns courses to staff.", "en");
    }

    private void seed(String slug, String title, String body, String locale) {
        if (articleRepository.existsBySlugAndLocale(slug, locale)) {
            return;
        }
        HelpArticle article = new HelpArticle();
        article.setSlug(slug);
        article.setTitle(title);
        article.setBody(body);
        article.setLocale(locale);
        articleRepository.save(article);
    }
}
