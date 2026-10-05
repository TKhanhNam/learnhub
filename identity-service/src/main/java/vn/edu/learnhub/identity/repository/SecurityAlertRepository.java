package vn.edu.learnhub.identity.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.identity.entity.SecurityAlert;

import java.time.Instant;
import java.util.List;

public interface SecurityAlertRepository extends JpaRepository<SecurityAlert, Long> {
    List<SecurityAlert> findTop50ByOrderByCreatedAtDesc();

    boolean existsByKindAndSourceIpAndStatusAndCreatedAtAfter(
            String kind, String sourceIp, String status, Instant createdAt);
}
