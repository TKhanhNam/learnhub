// path: learning-service/src/main/java/vn/edu/learnhub/learning/repository/EnrollmentRepository.java
// purpose: truy van quyen so huu khoa hoc.

package vn.edu.learnhub.learning.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.learnhub.learning.entity.Enrollment;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    Optional<Enrollment> findByUserIdAndCourseId(Long userId, Long courseId);

    boolean existsByUserIdAndCourseId(Long userId, Long courseId);

    Page<Enrollment> findByUserIdOrderByGrantedAtDesc(Long userId, Pageable pageable);

    List<Enrollment> findByUserId(Long userId);

    List<Enrollment> findByCourseIdIn(List<Long> courseIds);

    long countByCourseId(Long courseId);

    @Query("select count(e) from Enrollment e where e.courseId in :courseIds")
    long countByCourses(@Param("courseIds") List<Long> courseIds);

    @Query("select count(e) from Enrollment e where e.courseId in :courseIds and e.progressPercent >= 100")
    long countCompletedByCourses(@Param("courseIds") List<Long> courseIds);

    @Query("select coalesce(avg(e.progressPercent), 0) from Enrollment e where e.courseId in :courseIds")
    Double averageProgress(@Param("courseIds") List<Long> courseIds);
}
