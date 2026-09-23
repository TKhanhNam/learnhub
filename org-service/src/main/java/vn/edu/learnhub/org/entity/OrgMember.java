package vn.edu.learnhub.org.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "org_member")
public class OrgMember {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "org_id", nullable = false) private Long orgId;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false, length = 20) private String role = "LEARNER";
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public Long getOrgId() { return orgId; }
    public void setOrgId(Long orgId) { this.orgId = orgId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
