package vn.edu.learnhub.content.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.platform.client.ServiceClient;

@Component
public class CatalogInternalClient {
    private final ServiceClient client;
    @Value("${services.catalog-internal-url}") private String catalogUrl;

    public CatalogInternalClient(ServiceClient client) { this.client = client; }

    public Snapshot getCourse(Long id) {
        return client.get("catalog-service", catalogUrl + "/internal/courses/" + id, Snapshot.class);
    }

    public record Snapshot(Long id, String slug, String title, String thumbnailUrl,
                           java.math.BigDecimal price, Long instructorId, boolean aiAssistEnabled, String status) {}
}
