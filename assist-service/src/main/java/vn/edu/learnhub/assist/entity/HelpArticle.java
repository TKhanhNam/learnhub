package vn.edu.learnhub.assist.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "help_article")
public class HelpArticle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 140) private String slug;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, columnDefinition = "TEXT") private String body;
    @Column(nullable = false, length = 10) private String locale = "vi";
    public Long getId() { return id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getLocale() { return locale; }
    public void setLocale(String locale) { this.locale = locale; }
}
