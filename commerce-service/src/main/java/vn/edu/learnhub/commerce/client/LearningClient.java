package vn.edu.learnhub.commerce.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.commerce.dto.CommerceDtos;
import vn.edu.learnhub.platform.client.ServiceClient;

@Component
public class LearningClient {
    private final ServiceClient serviceClient;
    private final String baseUrl;

    public LearningClient(ServiceClient serviceClient,
                          @Value("${services.learning-internal-url}") String baseUrl) {
        this.serviceClient = serviceClient;
        this.baseUrl = baseUrl;
    }

    public CommerceDtos.GrantResult grant(Long userId, Long courseId, String source, Long orderId) {
        return serviceClient.post("learning", baseUrl + "/internal/enrollments/grant",
                new CommerceDtos.GrantRequest(userId, courseId, source, orderId),
                CommerceDtos.GrantResult.class);
    }

    public void revoke(Long userId, Long courseId) {
        serviceClient.post("learning",
                baseUrl + "/internal/enrollments/revoke?userId=" + userId + "&courseId=" + courseId,
                null, Void.class);
    }
}
