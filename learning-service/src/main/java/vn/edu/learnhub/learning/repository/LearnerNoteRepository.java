// path: learning-service/src/main/java/vn/edu/learnhub/learning/repository/LearnerNoteRepository.java
// purpose: truy van ghi chu khi hoc.

package vn.edu.learnhub.learning.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.learning.entity.LearnerNote;

import java.util.List;

public interface LearnerNoteRepository extends JpaRepository<LearnerNote, Long> {

    List<LearnerNote> findByEnrollmentIdOrderByCreatedAtDesc(Long enrollmentId);
}
