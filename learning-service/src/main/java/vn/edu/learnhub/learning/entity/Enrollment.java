// path: learning-service/src/main/java/vn/edu/learnhub/learning/entity/Enrollment.java
// purpose: quyen so huu khoa hoc cua hoc vien - TRON DOI, khong co ngay het han.
// Day la "ban dang ky" tuong duong Registration cua lab CRS, nhung khong gioi han so cho.

package vn.edu.learnhub.learning.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "enrollment")
public class Enrollment {

    public static final String SOURCE_PURCHASE = "PURCHASE";
    public static final String SOURCE_GIFT = "GIFT";
    public static final String SOURCE_ORG = "ORG";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(nullable = false, length = 20)
    private String source = SOURCE_PURCHASE;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "progress_percent", nullable = false)
    private Integer progressPercent = 0;

    @Column(name = "total_lectures", nullable = false)
    private Integer totalLectures = 0;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Integer getProgressPercent() {
        return progressPercent;
    }

    public void setProgressPercent(Integer progressPercent) {
        this.progressPercent = progressPercent;
    }

    public Integer getTotalLectures() {
        return totalLectures;
    }

    public void setTotalLectures(Integer totalLectures) {
        this.totalLectures = totalLectures;
    }

    public Instant getGrantedAt() {
        return grantedAt;
    }

    public void setGrantedAt(Instant grantedAt) {
        this.grantedAt = grantedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
