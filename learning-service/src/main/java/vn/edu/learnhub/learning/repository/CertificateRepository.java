// path: learning-service/src/main/java/vn/edu/learnhub/learning/repository/CertificateRepository.java
// purpose: truy van chung chi hoan thanh.

package vn.edu.learnhub.learning.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.learning.entity.Certificate;

import java.util.List;
import java.util.Optional;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    Optional<Certificate> findByEnrollmentId(Long enrollmentId);

    Optional<Certificate> findByCode(String code);

    List<Certificate> findByEnrollmentIdIn(List<Long> enrollmentIds);
}
