package vn.edu.learnhub.social.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.social.entity.Question;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByCourseIdOrderByCreatedAtDesc(Long courseId);
}
