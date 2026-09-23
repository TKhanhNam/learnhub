// path: learning-service/src/main/java/vn/edu/learnhub/learning/repository/LessonProgressRepository.java
// purpose: truy van tien do tung bai giang.

package vn.edu.learnhub.learning.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.learning.entity.LessonProgress;

import java.util.List;
import java.util.Optional;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

    Optional<LessonProgress> findByEnrollmentIdAndLectureId(Long enrollmentId, Long lectureId);

    List<LessonProgress> findByEnrollmentId(Long enrollmentId);

    long countByEnrollmentIdAndCompletedTrue(Long enrollmentId);
}
