package vn.edu.learnhub.org.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.org.entity.DemoRequest;

public interface DemoRequestRepository extends JpaRepository<DemoRequest, Long> {
}
