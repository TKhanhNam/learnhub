package vn.edu.learnhub.identity.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.identity.entity.PayoutKyc;

import java.util.List;

public interface PayoutKycRepository extends JpaRepository<PayoutKyc, Long> {
    List<PayoutKyc> findByStatusOrderBySubmittedAtDesc(String status);
}
