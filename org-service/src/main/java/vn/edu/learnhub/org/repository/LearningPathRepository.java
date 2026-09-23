package vn.edu.learnhub.org.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.org.entity.LearningPath;
import java.util.List;

public interface LearningPathRepository extends JpaRepository<LearningPath, Long> {
    List<LearningPath> findByOrgId(Long orgId);
}
