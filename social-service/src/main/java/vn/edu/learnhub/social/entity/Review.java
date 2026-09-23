package vn.edu.learnhub.social.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "review")
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "course_id", nullable = false) private Long courseId;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false) private Integer rating;
    @Column(length = 1000) private String comment;
    @Column(name = "instructor_reply", length = 1000) private String instructorReply;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public String getInstructorReply() { return instructorReply; }
    public void setInstructorReply(String instructorReply) { this.instructorReply = instructorReply; }
    public Instant getCreatedAt() { return createdAt; }
}
