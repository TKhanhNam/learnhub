// path: learning-service/src/main/java/vn/edu/learnhub/learning/client/CatalogClient.java
// purpose: goi API noi bo cua catalog-service de lay thong tin khoa hoc (ten, anh, chu khoa hoc).
// learning-service KHONG truy van truc tiep DB cua catalog (Database per Service).

package vn.edu.learnhub.learning.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.platform.client.ServiceClient;

import java.math.BigDecimal;
import java.util.List;

@Component
public class CatalogClient {

    private static final String TARGET = "catalog-service";

    private final ServiceClient serviceClient;

    @Value("${services.catalog-internal-url}")
    private String catalogUrl;

    public CatalogClient(ServiceClient serviceClient) {
        this.serviceClient = serviceClient;
    }

    public CourseSnapshot getCourse(Long courseId) {
        return serviceClient.get(TARGET, catalogUrl + "/internal/courses/" + courseId, CourseSnapshot.class);
    }

    public List<CourseSnapshot> getCourses(List<Long> courseIds) {
        CourseSnapshot[] snapshots = serviceClient.post(TARGET,
                catalogUrl + "/internal/courses/bulk", courseIds, CourseSnapshot[].class);
        return snapshots == null ? List.of() : List.of(snapshots);
    }

    public void increaseEnrollment(Long courseId, int delta) {
        serviceClient.patch(TARGET,
                catalogUrl + "/internal/courses/" + courseId + "/enrollment?delta=" + delta,
                null, Void.class);
    }

    public record CourseSnapshot(
            Long id,
            String slug,
            String title,
            String thumbnailUrl,
            BigDecimal price,
            Long instructorId,
            boolean aiAssistEnabled,
            String status) {
    }
}
