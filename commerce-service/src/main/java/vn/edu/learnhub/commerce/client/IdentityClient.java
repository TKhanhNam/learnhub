package vn.edu.learnhub.commerce.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.commerce.dto.CommerceDtos;
import vn.edu.learnhub.platform.client.ServiceClient;

@Component
public class IdentityClient {
    private final ServiceClient serviceClient;
    private final String baseUrl;

    public IdentityClient(ServiceClient serviceClient,
                          @Value("${services.identity-internal-url:http://localhost:8081}") String baseUrl) {
        this.serviceClient = serviceClient;
        this.baseUrl = baseUrl;
    }

    public CommerceDtos.PublicUser byEmail(String email) {
        return serviceClient.get("identity",
                baseUrl + "/internal/users/by-email?email=" + java.net.URLEncoder.encode(email,
                        java.nio.charset.StandardCharsets.UTF_8),
                CommerceDtos.PublicUser.class);
    }
}
