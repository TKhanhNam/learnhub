// path: learning-service/src/main/java/vn/edu/learnhub/learning/client/ContentClient.java
// purpose: goi API noi bo cua content-service de biet khoa hoc co bao nhieu bai giang
// (tinh % tien do) va lay dap an quiz (cham diem). Dap an KHONG BAO GIO tra ve Frontend.

package vn.edu.learnhub.learning.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.platform.client.ServiceClient;

import java.util.List;

@Component
public class ContentClient {

    private static final String TARGET = "content-service";

    private final ServiceClient serviceClient;

    @Value("${services.content-internal-url}")
    private String contentUrl;

    public ContentClient(ServiceClient serviceClient) {
        this.serviceClient = serviceClient;
    }

    public CourseContentStats getStats(Long courseId) {
        return serviceClient.get(TARGET,
                contentUrl + "/internal/courses/" + courseId + "/stats", CourseContentStats.class);
    }

    public QuizAnswerKey getQuizAnswerKey(Long quizId) {
        return serviceClient.get(TARGET,
                contentUrl + "/internal/quizzes/" + quizId + "/answer-key", QuizAnswerKey.class);
    }

    public record CourseContentStats(Long courseId, int lectureCount, int totalDurationSeconds) {
    }

    public record QuizAnswerKey(Long quizId, Long courseId, Integer passScore, List<AnswerKeyItem> questions) {
    }

    public record AnswerKeyItem(Long questionId, String correctOption) {
    }
}
