package vn.edu.learnhub.identity.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "blocked_ip")
public class BlockedIp {
    @Id
    @Column(length = 64)
    private String ip;
    @Column(nullable = false, length = 255)
    private String reason;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
