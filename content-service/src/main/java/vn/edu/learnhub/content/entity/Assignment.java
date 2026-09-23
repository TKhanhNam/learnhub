package vn.edu.learnhub.content.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "assignment")
public class Assignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "course_id", nullable = false) private Long courseId;
    @Column(nullable = false, length = 200) private String title;
    @Column(columnDefinition = "TEXT") private String instruction;

    public Long getId() { return id; }
    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getInstruction() { return instruction; }
    public void setInstruction(String instruction) { this.instruction = instruction; }
}
