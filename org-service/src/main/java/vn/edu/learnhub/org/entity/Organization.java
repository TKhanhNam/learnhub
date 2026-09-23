package vn.edu.learnhub.org.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "organization")
public class Organization {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 160) private String name;
    @Column(nullable = false, length = 40) private String plan = "TEAM";
    @Column(name = "seat_limit", nullable = false) private Integer seatLimit = 20;
    @Column(name = "owner_id", nullable = false) private Long ownerId;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }
    public Integer getSeatLimit() { return seatLimit; }
    public void setSeatLimit(Integer seatLimit) { this.seatLimit = seatLimit; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public Instant getCreatedAt() { return createdAt; }
}
