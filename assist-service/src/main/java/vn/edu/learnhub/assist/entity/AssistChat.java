package vn.edu.learnhub.assist.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "assist_chat")
public class AssistChat {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "course_id") private Long courseId;
    @Column(nullable = false, columnDefinition = "TEXT") private String question;
    @Column(nullable = false, columnDefinition = "TEXT") private String answer;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }
    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
    public Instant getCreatedAt() { return createdAt; }
}
