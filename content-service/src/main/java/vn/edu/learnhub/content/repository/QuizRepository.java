package vn.edu.learnhub.content.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.content.entity.Quiz;

import java.util.List;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    List<Quiz> findByCourseId(Long courseId);
}
