package vn.edu.learnhub.social.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.social.entity.Answer;
import java.util.List;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
    List<Answer> findByQuestionIdOrderByCreatedAtAsc(Long questionId);
}
