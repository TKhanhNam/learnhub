package vn.edu.learnhub.commerce.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class CommerceDtos {
    private CommerceDtos() {}

    public record AddCartRequest(@NotNull(message = "Thieu ma khoa hoc") Long courseId) {}

    public record CartItemDTO(Long id, Long courseId, String title, String thumbnailUrl,
                              BigDecimal price, Long instructorId, boolean aiAssistEnabled) {}

    public record CartDTO(List<CartItemDTO> items, BigDecimal subtotal) {}

    public record CheckoutRequest(String couponCode, boolean gift, Long recipientUserId, String recipientEmail) {}

    public record OrderItemDTO(Long courseId, String title, BigDecimal price, Long instructorId, boolean aiAssist) {}

    public record OrderDTO(Long id, Long buyerId, Long recipientId, String recipientEmail, String status,
                           String couponCode, BigDecimal subtotal, BigDecimal discount, BigDecimal total,
                           BigDecimal platformFee, BigDecimal instructorEarn, Instant createdAt,
                           List<OrderItemDTO> items) {}

    public record InstructorPayoutDTO(Long instructorId, BigDecimal gross, BigDecimal platformFee,
                                      BigDecimal net, long orderItemCount) {}

    public record CourseSnapshot(Long id, String slug, String title, String thumbnailUrl,
                                 BigDecimal price, Long instructorId, boolean aiAssistEnabled, String status) {}

    public record CouponCheck(boolean valid, Long couponId, Integer discountPercent, String message) {}

    public record GrantRequest(Long userId, Long courseId, String source, Long orderId) {}

    public record GrantResult(Long enrollmentId, boolean created) {}

    public record PublicUser(Long id, String fullName, String headline, String avatarUrl, String role) {}

    public record DailyPoint(String date, BigDecimal revenue, long orders) {}

    public record CourseRevenue(Long courseId, String title, long sold, BigDecimal revenue) {}

    public record AdminStatsDTO(
            long paidOrders,
            long failedOrders,
            BigDecimal revenue,
            BigDecimal platformFee,
            BigDecimal instructorEarn,
            BigDecimal avgOrder,
            long itemsSold) {}

    public record AnalyticsDTO(
            AdminStatsDTO summary,
            List<DailyPoint> last14Days,
            List<CourseRevenue> topCourses) {}
}
