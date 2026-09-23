// path: learning-service/src/main/java/vn/edu/learnhub/learning/entity/Certificate.java
// purpose: chung chi hoan thanh khoa hoc. pdf_status = PENDING khi vua cap (file PDF dang duoc
// tao ngam boi worker) va chuyen READY khi xong => API tra HTTP 202 thay vi bat nguoi dung cho.

package vn.edu.learnhub.learning.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "certificate")
public class Certificate {

    public static final String PDF_PENDING = "PENDING";
    public static final String PDF_READY = "READY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enrollment_id", nullable = false, unique = true)
    private Long enrollmentId;

    @Column(nullable = false, length = 40, unique = true)
    private String code;

    @Column(name = "pdf_status", nullable = false, length = 20)
    private String pdfStatus = PDF_PENDING;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt = Instant.now();

    public Long getId() {
        return id;
    }

    public Long getEnrollmentId() {
        return enrollmentId;
    }

    public void setEnrollmentId(Long enrollmentId) {
        this.enrollmentId = enrollmentId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getPdfStatus() {
        return pdfStatus;
    }

    public void setPdfStatus(String pdfStatus) {
        this.pdfStatus = pdfStatus;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }
}
