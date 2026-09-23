package vn.edu.learnhub.social.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "question")
public class Question {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "course_id", nullable = false) private Long courseId;
    @Column(name = "lecture_id") private Long lectureId;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, columnDefinition = "TEXT") private String body;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }
    public Long getLectureId() { return lectureId; }
    public void setLectureId(Long lectureId) { this.lectureId = lectureId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public Instant getCreatedAt() { return createdAt; }
}
