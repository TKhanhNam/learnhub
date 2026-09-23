package vn.edu.learnhub.content.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "lecture")
public class Lecture {
    public static final String VIDEO = "VIDEO";
    public static final String TEXT = "TEXT";
    public static final String SLIDE = "SLIDE";

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "course_id", nullable = false) private Long courseId;
    @Column(nullable = false, length = 200) private String title;
    @Column(name = "sort_order", nullable = false) private int sortOrder;
    @Column(nullable = false, length = 20) private String type = VIDEO;
    @Column(name = "video_url", length = 500) private String videoUrl;
    @Column(name = "body_html", columnDefinition = "TEXT") private String bodyHtml;
    @Column(name = "duration_seconds", nullable = false) private int durationSeconds;
    @Column(name = "download_url", length = 500) private String downloadUrl;

    public Long getId() { return id; }
    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public String getBodyHtml() { return bodyHtml; }
    public void setBodyHtml(String bodyHtml) { this.bodyHtml = bodyHtml; }
    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }
    public String getDownloadUrl() { return downloadUrl; }
    public void setDownloadUrl(String downloadUrl) { this.downloadUrl = downloadUrl; }
}
