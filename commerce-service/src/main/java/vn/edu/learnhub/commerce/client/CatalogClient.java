package vn.edu.learnhub.commerce.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.commerce.dto.CommerceDtos;
import vn.edu.learnhub.platform.client.ServiceClient;

import java.util.Map;

@Component
public class CatalogClient {
    private final ServiceClient serviceClient;
    private final String baseUrl;

    public CatalogClient(ServiceClient serviceClient,
                         @Value("${services.catalog-internal-url}") String baseUrl) {
        this.serviceClient = serviceClient;
        this.baseUrl = baseUrl;
    }

    public CommerceDtos.CourseSnapshot snapshot(Long courseId) {
        return serviceClient.get("catalog", baseUrl + "/internal/courses/" + courseId,
                CommerceDtos.CourseSnapshot.class);
    }

    public CommerceDtos.CouponCheck checkCoupon(String code, Long courseId) {
        return serviceClient.post("catalog", baseUrl + "/internal/coupons/check",
                new CouponCheckRequest(code, courseId), CommerceDtos.CouponCheck.class);
    }

    public void redeem(Long couponId) {
        serviceClient.post("catalog", baseUrl + "/internal/coupons/" + couponId + "/redeem",
                null, Void.class);
    }

    public void release(Long couponId) {
        serviceClient.post("catalog", baseUrl + "/internal/coupons/" + couponId + "/release",
                null, Void.class);
    }

    public void increaseEnrollment(Long courseId) {
        serviceClient.post("catalog", baseUrl + "/internal/courses/" + courseId + "/enrollment?delta=1",
                Map.of("delta", 1), Void.class);
    }

    public record CouponCheckRequest(String code, Long courseId) {}
}
