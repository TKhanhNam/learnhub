package vn.edu.learnhub.org.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "demo_request")
public class DemoRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 160) private String company;
    @Column(name = "contact_email", nullable = false, length = 160) private String contactEmail;
    @Column(length = 1000) private String message;
    @Column(nullable = false, length = 20) private String status = "NEW";
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
