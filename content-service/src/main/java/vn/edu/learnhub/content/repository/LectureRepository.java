package vn.edu.learnhub.content.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.content.entity.Lecture;

import java.util.List;

public interface LectureRepository extends JpaRepository<Lecture, Long> {
    List<Lecture> findByCourseIdOrderBySortOrderAsc(Long courseId);
    long countByCourseId(Long courseId);
}
