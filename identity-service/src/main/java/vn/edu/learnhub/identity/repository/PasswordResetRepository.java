package vn.edu.learnhub.identity.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.identity.entity.PasswordReset;

import java.util.Optional;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, Long> {
    Optional<PasswordReset> findByTokenHash(String tokenHash);

    void deleteByUserId(Long userId);
}
