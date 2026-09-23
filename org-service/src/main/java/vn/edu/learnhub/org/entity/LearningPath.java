package vn.edu.learnhub.org.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "learning_path")
public class LearningPath {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "org_id", nullable = false) private Long orgId;
    @Column(nullable = false, length = 200) private String title;
    @Column(name = "course_ids", nullable = false, length = 500) private String courseIds;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public Long getOrgId() { return orgId; }
    public void setOrgId(Long orgId) { this.orgId = orgId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCourseIds() { return courseIds; }
    public void setCourseIds(String courseIds) { this.courseIds = courseIds; }
    public Instant getCreatedAt() { return createdAt; }
}
