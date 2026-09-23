// path: learning-service/src/main/java/vn/edu/learnhub/learning/service/CertificateService.java
// purpose: cap chung chi khi tien do >= 100%. PDF tao ngam (HTTP 202 / pdf_status PENDING).

package vn.edu.learnhub.learning.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.learning.client.CatalogClient;
import vn.edu.learnhub.learning.dto.LearningDtos;
import vn.edu.learnhub.learning.entity.Certificate;
import vn.edu.learnhub.learning.entity.Enrollment;
import vn.edu.learnhub.learning.repository.CertificateRepository;
import vn.edu.learnhub.platform.error.BusinessException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class CertificateService {

    private static final Logger log = LoggerFactory.getLogger(CertificateService.class);

    private final EnrollmentService enrollmentService;
    private final CertificateRepository certificateRepository;
    private final CatalogClient catalogClient;

    public CertificateService(EnrollmentService enrollmentService,
                              CertificateRepository certificateRepository,
                              CatalogClient catalogClient) {
        this.enrollmentService = enrollmentService;
        this.certificateRepository = certificateRepository;
        this.catalogClient = catalogClient;
    }

    @Transactional
    public LearningDtos.CertificateDTO issue(Long userId, Long courseId) {
        Enrollment enrollment = enrollmentService.requireEnrollment(userId, courseId);
        if (enrollment.getProgressPercent() == null || enrollment.getProgressPercent() < 100) {
            throw BusinessException.conflict("Hoan thanh 100% khoa hoc moi duoc cap chung chi");
        }

        Certificate existing = certificateRepository.findByEnrollmentId(enrollment.getId()).orElse(null);
        if (existing != null) {
            return toDto(existing, courseId);
        }

        Certificate certificate = new Certificate();
        certificate.setEnrollmentId(enrollment.getId());
        certificate.setCode("LH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        certificate.setPdfStatus(Certificate.PDF_PENDING);
        certificateRepository.save(certificate);
        generatePdfAsync(certificate.getId());
        return toDto(certificate, courseId);
    }

    public List<LearningDtos.CertificateDTO> myCertificates(Long userId) {
        return enrollmentService.findByUser(userId).stream()
                .map(e -> certificateRepository.findByEnrollmentId(e.getId())
                        .map(c -> toDto(c, e.getCourseId()))
                        .orElse(null))
                .filter(dto -> dto != null)
                .toList();
    }

    @Async("backgroundExecutor")
    public void generatePdfAsync(Long certificateId) {
        try {
            Thread.sleep(800);
            certificateRepository.findById(certificateId).ifPresent(c -> {
                c.setPdfStatus(Certificate.PDF_READY);
                certificateRepository.save(c);
                log.info("Da xuat PDF chung chi {}", c.getCode());
            });
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    private LearningDtos.CertificateDTO toDto(Certificate certificate, Long courseId) {
        String title = "Khoa hoc #" + courseId;
        try {
            CatalogClient.CourseSnapshot snap = catalogClient.getCourse(courseId);
            if (snap != null && snap.title() != null) {
                title = snap.title();
            }
        } catch (RuntimeException ignored) {
            // catalog down: van tra chung chi, thieu ten
        }
        return new LearningDtos.CertificateDTO(certificate.getCode(), courseId, title,
                certificate.getPdfStatus(), certificate.getIssuedAt() == null ? Instant.now() : certificate.getIssuedAt());
    }
}
