// path: learning-service/src/main/java/vn/edu/learnhub/learning/entity/AssignmentSubmission.java
// purpose: bai tap - hoc vien nop LINK bai lam, giang vien cham diem va nhan xet.

package vn.edu.learnhub.learning.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "assignment_submission")
public class AssignmentSubmission {

    public static final String STATUS_SUBMITTED = "SUBMITTED";
    public static final String STATUS_GRADED = "GRADED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "link_url", nullable = false, length = 500)
    private String linkUrl;

    @Column(length = 500)
    private String note;

    @Column(nullable = false, length = 20)
    private String status = STATUS_SUBMITTED;

    private Integer score;

    @Column(length = 500)
    private String feedback;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "graded_at")
    private Instant gradedAt;

    public Long getId() {
        return id;
    }

    public Long getEnrollmentId() {
        return enrollmentId;
    }

    public void setEnrollmentId(Long enrollmentId) {
        this.enrollmentId = enrollmentId;
    }

    public Long getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(Long assignmentId) {
        this.assignmentId = assignmentId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public String getLinkUrl() {
        return linkUrl;
    }

    public void setLinkUrl(String linkUrl) {
        this.linkUrl = linkUrl;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getGradedAt() {
        return gradedAt;
    }

    public void setGradedAt(Instant gradedAt) {
        this.gradedAt = gradedAt;
    }
}
