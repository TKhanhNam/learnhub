package vn.edu.learnhub.content.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.content.entity.QuizQuestion;

import java.util.List;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    List<QuizQuestion> findByQuizId(Long quizId);
}
