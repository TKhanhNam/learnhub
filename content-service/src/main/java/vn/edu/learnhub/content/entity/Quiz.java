package vn.edu.learnhub.content.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "quiz")
public class Quiz {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "course_id", nullable = false) private Long courseId;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, length = 20) private String kind = "QUIZ";
    @Column(name = "pass_score", nullable = false) private Integer passScore = 70;

    public Long getId() { return id; }
    public Long getCourseId() { return courseId; }
    public void setCourseId(Long c) { this.courseId = c; }
    public String getTitle() { return title; }
    public void setTitle(String t) { this.title = t; }
    public String getKind() { return kind; }
    public void setKind(String k) { this.kind = k; }
    public Integer getPassScore() { return passScore; }
    public void setPassScore(Integer p) { this.passScore = p; }
}
