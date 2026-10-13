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

    public boolean emailVerified(Long userId) {
        try {
            Flag flag = serviceClient.get("identity",
                    baseUrl + "/internal/users/" + userId + "/email-verified", Flag.class);
            return flag != null && flag.emailVerified();
        } catch (vn.edu.learnhub.platform.error.BusinessException ex) {
            if (ex.getStatus() == org.springframework.http.HttpStatus.NOT_FOUND) {
                return true;
            }
            throw ex;
        }
    }

    public CommerceDtos.PublicUser byEmail(String email) {
        return serviceClient.get("identity",
                baseUrl + "/internal/users/by-email?email=" + java.net.URLEncoder.encode(email,
                        java.nio.charset.StandardCharsets.UTF_8),
                CommerceDtos.PublicUser.class);
    }

    private record Flag(boolean emailVerified) {}
}
