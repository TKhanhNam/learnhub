package vn.edu.learnhub.payment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "payment_transaction")
public class PaymentTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "commerce_order_id", nullable = false)
    private Long commerceOrderId;
    @Column(nullable = false, length = 20)
    private String gateway;
    @Column(name = "gateway_order_id", length = 80)
    private String gatewayOrderId;
    @Column(nullable = false)
    private Long amount;
    @Column(nullable = false, length = 20)
    private String status;
    @Column(name = "result_code")
    private Integer resultCode;
    @Column(length = 255)
    private String message;
    @Column(name = "trans_id", length = 64)
    private String transId;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
    @Column(name = "paid_at")
    private Instant paidAt;

    public Long getId() { return id; }
    public Long getCommerceOrderId() { return commerceOrderId; }
    public void setCommerceOrderId(Long commerceOrderId) { this.commerceOrderId = commerceOrderId; }
    public String getGateway() { return gateway; }
    public void setGateway(String gateway) { this.gateway = gateway; }
    public String getGatewayOrderId() { return gatewayOrderId; }
    public void setGatewayOrderId(String gatewayOrderId) { this.gatewayOrderId = gatewayOrderId; }
    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getResultCode() { return resultCode; }
    public void setResultCode(Integer resultCode) { this.resultCode = resultCode; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getTransId() { return transId; }
    public void setTransId(String transId) { this.transId = transId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
}
