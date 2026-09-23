package vn.edu.learnhub.content.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.platform.client.ServiceClient;

@Component
public class LearningInternalClient {
    private final ServiceClient client;
    @Value("${services.learning-internal-url}") private String learningUrl;

    public LearningInternalClient(ServiceClient client) { this.client = client; }

    public boolean hasAccess(Long userId, Long courseId) {
        if (userId == null) return false;
        try {
            Access dto = client.get("learning-service",
                    learningUrl + "/internal/enrollments/access?userId=" + userId + "&courseId=" + courseId,
                    Access.class);
            return dto != null && dto.hasAccess();
        } catch (RuntimeException ex) {
            return false;
        }
    }

    public record Access(boolean hasAccess, Long enrollmentId, Integer progressPercent) {}
}
