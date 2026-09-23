package vn.edu.learnhub.social.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "answer")
public class Answer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "question_id", nullable = false) private Long questionId;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false, columnDefinition = "TEXT") private String body;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public Instant getCreatedAt() { return createdAt; }
}
