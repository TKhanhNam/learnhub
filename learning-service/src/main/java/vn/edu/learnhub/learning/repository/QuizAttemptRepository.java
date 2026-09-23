// path: learning-service/src/main/java/vn/edu/learnhub/learning/repository/QuizAttemptRepository.java
// purpose: truy van luot lam quiz.

package vn.edu.learnhub.learning.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.learning.entity.QuizAttempt;

import java.util.List;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    List<QuizAttempt> findByEnrollmentIdOrderByCreatedAtDesc(Long enrollmentId);

    List<QuizAttempt> findByEnrollmentIdAndQuizIdOrderByCreatedAtDesc(Long enrollmentId, Long quizId);
}
