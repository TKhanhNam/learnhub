package vn.edu.learnhub.identity.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.identity.entity.EmailVerification;

import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    Optional<EmailVerification> findByTokenHash(String tokenHash);
}
