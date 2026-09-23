package vn.edu.learnhub.identity.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.identity.entity.EmailOutbox;

public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, Long> {
    Page<EmailOutbox> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
