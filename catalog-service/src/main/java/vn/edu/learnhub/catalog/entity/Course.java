// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/entity/Course.java
// purpose: entity khoa hoc ban tren san.
// LUU Y bien gioi service: o day chi co THONG TIN BAN (ten, gia, danh muc, trang thai duyet).
// Bai giang/video nam o content-service; quyen so huu cua hoc vien nam o learning-service.

package vn.edu.learnhub.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "course")
public class Course {

    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_REJECTED = "REJECTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 220, unique = true)
    private String slug;

    @Column(length = 300)
    private String subtitle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "instructor_id", nullable = false)
    private Long instructorId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String level = "BEGINNER";

    @Column(nullable = false, length = 5)
    private String language = "vi";

    @Column(name = "thumbnail_url", length = 400)
    private String thumbnailUrl;

    @Column(name = "promo_video_url", length = 400)
    private String promoVideoUrl;

    /** Danh sach ky nang cach nhau dau phay, dung cho loc "ky nang dang thinh hanh". */
    @Column(length = 400)
    private String skills;

    @Column(nullable = false, length = 20)
    private String status = STATUS_DRAFT;

    /** Bat tro ly AI cho khoa nay => san thu them % hoa hong (cau hinh o commerce-service). */
    @Column(name = "ai_assist_enabled", nullable = false)
    private boolean aiAssistEnabled = false;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private Integer ratingCount = 0;

    @Column(name = "enrollment_count", nullable = false)
    private Integer enrollmentCount = 0;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getSubtitle() {
        return subtitle;
    }

    public void setSubtitle(String subtitle) {
        this.subtitle = subtitle;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public Long getInstructorId() {
        return instructorId;
    }

    public void setInstructorId(Long instructorId) {
        this.instructorId = instructorId;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getPromoVideoUrl() {
        return promoVideoUrl;
    }

    public void setPromoVideoUrl(String promoVideoUrl) {
        this.promoVideoUrl = promoVideoUrl;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isAiAssistEnabled() {
        return aiAssistEnabled;
    }

    public void setAiAssistEnabled(boolean aiAssistEnabled) {
        this.aiAssistEnabled = aiAssistEnabled;
    }

    public BigDecimal getRatingAvg() {
        return ratingAvg;
    }

    public void setRatingAvg(BigDecimal ratingAvg) {
        this.ratingAvg = ratingAvg;
    }

    public Integer getRatingCount() {
        return ratingCount;
    }

    public void setRatingCount(Integer ratingCount) {
        this.ratingCount = ratingCount;
    }

    public Integer getEnrollmentCount() {
        return enrollmentCount;
    }

    public void setEnrollmentCount(Integer enrollmentCount) {
        this.enrollmentCount = enrollmentCount;
    }

    public Integer getViewCount() {
        return viewCount;
    }

    public void setViewCount(Integer viewCount) {
        this.viewCount = viewCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }
}
