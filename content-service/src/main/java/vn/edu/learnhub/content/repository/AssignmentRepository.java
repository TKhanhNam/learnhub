package vn.edu.learnhub.content.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.content.entity.Assignment;

import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByCourseId(Long courseId);
}
