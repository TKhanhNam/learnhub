// path: learning-service/src/main/java/vn/edu/learnhub/learning/repository/AssignmentSubmissionRepository.java
// purpose: truy van bai tap da nop.

package vn.edu.learnhub.learning.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.learning.entity.AssignmentSubmission;

import java.util.List;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {

    List<AssignmentSubmission> findByEnrollmentIdOrderByCreatedAtDesc(Long enrollmentId);

    List<AssignmentSubmission> findByCourseIdOrderByCreatedAtDesc(Long courseId);
}
