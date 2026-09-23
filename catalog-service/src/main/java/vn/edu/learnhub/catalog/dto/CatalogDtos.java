// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/dto/CatalogDtos.java
// purpose: hop dong du lieu (contract) giua catalog-service va ben ngoai.
// Entity Course khong bao gio duoc tra thang ra API (Buoi 2).

package vn.edu.learnhub.catalog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record CategoryDTO(Long id, String name, String slug, String description) {
    }

    public record CourseSummaryDTO(
            Long id,
            String slug,
            String title,
            String subtitle,
            String thumbnailUrl,
            BigDecimal price,
            String level,
            String language,
            Long categoryId,
            String categoryName,
            Long instructorId,
            BigDecimal ratingAvg,
            Integer ratingCount,
            Integer enrollmentCount,
            List<String> skills,
            boolean aiAssistEnabled,
            String status) {
    }

    public record CourseDetailDTO(
            Long id,
            String slug,
            String title,
            String subtitle,
            String description,
            String thumbnailUrl,
            String promoVideoUrl,
            BigDecimal price,
            String level,
            String language,
            Long categoryId,
            String categoryName,
            String categorySlug,
            Long instructorId,
            BigDecimal ratingAvg,
            Integer ratingCount,
            Integer enrollmentCount,
            List<String> skills,
            boolean aiAssistEnabled,
            String status,
            Instant createdAt,
            Instant publishedAt) {
    }

    public record CourseRequest(
            @NotBlank(message = "Tieu de khoa hoc khong duoc de trong")
            @Size(max = 200, message = "Tieu de toi da 200 ky tu") String title,

            @Size(max = 300, message = "Tieu de phu toi da 300 ky tu") String subtitle,

            String description,

            @NotNull(message = "Phai chon danh muc") Long categoryId,

            @NotNull(message = "Phai nhap gia ban")
            @DecimalMin(value = "0.0", message = "Gia khong duoc am") BigDecimal price,

            String level,
            String language,
            String thumbnailUrl,
            String promoVideoUrl,
            List<String> skills,
            Boolean aiAssistEnabled) {
    }

    public record ModerateRequest(
            @NotBlank(message = "Phai chon hanh dong APPROVE hoac REJECT") String action,
            String note) {
    }

    public record CouponRequest(
            @NotBlank(message = "Ma giam gia khong duoc de trong")
            @Size(min = 3, max = 40, message = "Ma giam gia tu 3 den 40 ky tu") String code,

            Long courseId,

            @NotNull(message = "Phai nhap phan tram giam")
            @Min(value = 1, message = "Phan tram giam tu 1 den 100")
            @Max(value = 100, message = "Phan tram giam tu 1 den 100") Integer discountPercent,

            @Min(value = 1, message = "So luot dung toi thieu la 1") Integer maxUses,

            Instant validTo) {
    }

    public record CouponDTO(
            Long id,
            String code,
            Long courseId,
            String ownerType,
            Long ownerId,
            Integer discountPercent,
            Integer maxUses,
            Integer usedCount,
            Instant validFrom,
            Instant validTo,
            boolean active) {
    }

    /** Ban rut gon cho commerce-service doc khi tao don hang (API noi bo). */
    public record CourseSnapshotDTO(
            Long id,
            String slug,
            String title,
            String thumbnailUrl,
            BigDecimal price,
            Long instructorId,
            boolean aiAssistEnabled,
            String status) {
    }

    public record CouponCheckRequest(String code, Long courseId) {
    }

    public record CouponCheckResponse(boolean valid, Long couponId, Integer discountPercent, String message) {
    }

    public record RatingUpdateRequest(BigDecimal ratingAvg, Integer ratingCount) {
    }

    public record TrendingSkillDTO(String skill, long courseCount) {
    }

    public record AdminStatsDTO(
            long total,
            long draft,
            long pending,
            long published,
            long rejected,
            long enrollments) {
    }
}
