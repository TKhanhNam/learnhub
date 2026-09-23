// path: learning-service/src/main/java/vn/edu/learnhub/learning/entity/QuizAttempt.java
// purpose: luot lam quiz / practice test cua hoc vien va diem so.

package vn.edu.learnhub.learning.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "quiz_attempt")
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "quiz_id", nullable = false)
    private Long quizId;

    @Column(nullable = false)
    private Integer score;

    @Column(nullable = false)
    private Integer total;

    @Column(nullable = false)
    private boolean passed;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() {
        return id;
    }

    public Long getEnrollmentId() {
        return enrollmentId;
    }

    public void setEnrollmentId(Long enrollmentId) {
        this.enrollmentId = enrollmentId;
    }

    public Long getQuizId() {
        return quizId;
    }

    public void setQuizId(Long quizId) {
        this.quizId = quizId;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public Integer getTotal() {
        return total;
    }

    public void setTotal(Integer total) {
        this.total = total;
    }

    public boolean isPassed() {
        return passed;
    }

    public void setPassed(boolean passed) {
        this.passed = passed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
