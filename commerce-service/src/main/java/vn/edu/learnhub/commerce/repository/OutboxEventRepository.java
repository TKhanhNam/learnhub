package vn.edu.learnhub.commerce.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.commerce.entity.OutboxEvent;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {
}
