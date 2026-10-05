package vn.edu.learnhub.social.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.learnhub.social.entity.Review;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByCourseIdOrderByCreatedAtDesc(Long courseId);
    Optional<Review> findByCourseIdAndUserId(Long courseId, Long userId);
    long countByCourseId(Long courseId);

    @Query("select coalesce(avg(r.rating), 0) from Review r where r.courseId = :courseId")
    Double averageRating(@Param("courseId") Long courseId);
}
