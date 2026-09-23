// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/entity/Coupon.java
// purpose: ma giam gia. owner_type = INSTRUCTOR (ma rieng cua giang vien cho khoa cua minh)
// hoac PLATFORM (ma cua san do admin phat hanh).

package vn.edu.learnhub.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "coupon")
public class Coupon {

    public static final String OWNER_INSTRUCTOR = "INSTRUCTOR";
    public static final String OWNER_PLATFORM = "PLATFORM";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40, unique = true)
    private String code;

    /** null = ap dung cho moi khoa hoc thuoc pham vi cua chu so huu ma. */
    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "owner_type", nullable = false, length = 20)
    private String ownerType;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "discount_percent", nullable = false)
    private Integer discountPercent;

    @Column(name = "max_uses", nullable = false)
    private Integer maxUses = 100;

    @Column(name = "used_count", nullable = false)
    private Integer usedCount = 0;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom = Instant.now();

    @Column(name = "valid_to", nullable = false)
    private Instant validTo;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public boolean isUsable(Instant now) {
        return active
                && usedCount < maxUses
                && !now.isBefore(validFrom)
                && !now.isAfter(validTo);
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public String getOwnerType() {
        return ownerType;
    }

    public void setOwnerType(String ownerType) {
        this.ownerType = ownerType;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
    }

    public Integer getDiscountPercent() {
        return discountPercent;
    }

    public void setDiscountPercent(Integer discountPercent) {
        this.discountPercent = discountPercent;
    }

    public Integer getMaxUses() {
        return maxUses;
    }

    public void setMaxUses(Integer maxUses) {
        this.maxUses = maxUses;
    }

    public Integer getUsedCount() {
        return usedCount;
    }

    public void setUsedCount(Integer usedCount) {
        this.usedCount = usedCount;
    }

    public Instant getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(Instant validFrom) {
        this.validFrom = validFrom;
    }

    public Instant getValidTo() {
        return validTo;
    }

    public void setValidTo(Instant validTo) {
        this.validTo = validTo;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
