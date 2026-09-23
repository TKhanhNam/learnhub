package vn.edu.learnhub.commerce.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "orders")
public class Order {

    public static final String PAID = "PAID";
    public static final String FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "buyer_id", nullable = false)
    private Long buyerId;

    @Column(name = "recipient_id")
    private Long recipientId;

    @Column(name = "recipient_email", length = 160)
    private String recipientEmail;

    @Column(nullable = false, length = 20)
    private String status = PAID;

    @Column(name = "coupon_code", length = 40)
    private String couponCode;

    @Column(name = "coupon_id")
    private Long couponId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "platform_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal platformFee = BigDecimal.ZERO;

    @Column(name = "instructor_earn", nullable = false, precision = 12, scale = 2)
    private BigDecimal instructorEarn = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public Long getBuyerId() { return buyerId; }
    public void setBuyerId(Long buyerId) { this.buyerId = buyerId; }
    public Long getRecipientId() { return recipientId; }
    public void setRecipientId(Long recipientId) { this.recipientId = recipientId; }
    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public Long getCouponId() { return couponId; }
    public void setCouponId(Long couponId) { this.couponId = couponId; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getDiscount() { return discount; }
    public void setDiscount(BigDecimal discount) { this.discount = discount; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public BigDecimal getPlatformFee() { return platformFee; }
    public void setPlatformFee(BigDecimal platformFee) { this.platformFee = platformFee; }
    public BigDecimal getInstructorEarn() { return instructorEarn; }
    public void setInstructorEarn(BigDecimal instructorEarn) { this.instructorEarn = instructorEarn; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
