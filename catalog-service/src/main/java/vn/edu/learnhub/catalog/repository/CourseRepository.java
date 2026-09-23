// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/repository/CourseRepository.java
// purpose: truy van khoa hoc co tim kiem + loc + phan trang (Buoi 3).
// Cac tham so loc dung gia tri "trung tinh" ('' hoac 0) thay vi null de cau JPQL don gian,
// khong phu thuoc cach Hibernate suy dien kieu cua tham so null.

package vn.edu.learnhub.catalog.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.learnhub.catalog.entity.Course;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    Optional<Course> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsByTitle(String title);

    Page<Course> findByInstructorId(Long instructorId, Pageable pageable);

    Page<Course> findByStatus(String status, Pageable pageable);

    Page<Course> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    Page<Course> findByStatusAndTitleContainingIgnoreCase(String status, String title, Pageable pageable);

    List<Course> findByStatusOrderByEnrollmentCountDesc(String status, Pageable pageable);

    List<Course> findByStatusOrderByViewCountDesc(String status, Pageable pageable);

    List<Course> findByIdIn(List<Long> ids);

    long countByInstructorId(Long instructorId);

    @Query("""
            select c from Course c
            where c.status = :status
              and (:keyword = '' or lower(c.title) like lower(concat('%', :keyword, '%'))
                                 or lower(coalesce(c.subtitle, '')) like lower(concat('%', :keyword, '%'))
                                 or lower(coalesce(c.skills, '')) like lower(concat('%', :keyword, '%')))
              and (:categoryId = 0 or c.categoryId = :categoryId)
              and (:level = '' or c.level = :level)
              and (:language = '' or c.language = :language)
              and c.price >= :minPrice
              and c.price <= :maxPrice
            """)
    Page<Course> search(@Param("status") String status,
                        @Param("keyword") String keyword,
                        @Param("categoryId") Long categoryId,
                        @Param("level") String level,
                        @Param("language") String language,
                        @Param("minPrice") BigDecimal minPrice,
                        @Param("maxPrice") BigDecimal maxPrice,
                        Pageable pageable);

    @Query("select c.skills from Course c where c.status = :status and c.skills is not null")
    List<String> findAllSkills(@Param("status") String status);

    @Query("select count(c) from Course c where c.status = :status")
    long countByStatusValue(@Param("status") String status);

    @Query("select coalesce(sum(c.enrollmentCount), 0) from Course c")
    long sumEnrollments();

    @Modifying
    @Query("update Course c set c.viewCount = coalesce(c.viewCount, 0) + 1 where c.id = :id")
    int incrementViewCount(@Param("id") Long id);
}
