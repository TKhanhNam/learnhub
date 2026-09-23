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

import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AssistService {
    private final HelpArticleRepository articleRepository;
    private final AssistChatRepository chatRepository;
    private final AtomicInteger extraPercent;

    public AssistService(HelpArticleRepository articleRepository,
                         AssistChatRepository chatRepository,
                         @Value("${assist.ai-extra-percent:5}") int extraPercent) {
        this.articleRepository = articleRepository;
        this.chatRepository = chatRepository;
        this.extraPercent = new AtomicInteger(extraPercent);
    }

    public List<AssistDtos.HelpDTO> help(String locale) {
        String loc = locale == null || locale.isBlank() ? "vi" : locale;
        return articleRepository.findByLocaleOrderByTitleAsc(loc).stream()
                .map(a -> new AssistDtos.HelpDTO(a.getId(), a.getSlug(), a.getTitle(), a.getBody(), a.getLocale()))
                .toList();
    }

    public AssistDtos.ChatDTO chat(Long userId, AssistDtos.ChatRequest request) {
        String q = request.question().toLowerCase(Locale.ROOT);
        String answer = articleRepository.findByLocaleOrderByTitleAsc("vi").stream()
                .filter(a -> a.getTitle().toLowerCase(Locale.ROOT).contains(q)
                        || a.getBody().toLowerCase(Locale.ROOT).contains(q)
                        || q.contains(a.getSlug().replace("-", " ")))
                .map(HelpArticle::getBody)
                .findFirst()
                .orElse("Day la tro ly LearnHub (ban demo). Ban co the xem Help, mua khoa o gio hang, "
                        + "roi vao My Learning de hoc. Khoa co AI se tinh them " + extraPercent.get()
                        + "% phi nen tang. Dat cau hoi ve refund, coupon LEARNHUB20, hoac doanh nghiep.");
        AssistChat chat = new AssistChat();
        chat.setUserId(userId);
        chat.setCourseId(request.courseId());
        chat.setQuestion(request.question());
        chat.setAnswer(answer);
        chat = chatRepository.save(chat);
        return new AssistDtos.ChatDTO(chat.getId(), chat.getCourseId(), chat.getQuestion(),
                chat.getAnswer(), chat.getCreatedAt());
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
