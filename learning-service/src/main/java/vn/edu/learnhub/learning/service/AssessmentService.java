// path: learning-service/src/main/java/vn/edu/learnhub/learning/service/AssessmentService.java
// purpose: cham quiz (dap an lay noi bo tu content-service) va nhan bai tap (nop link).

package vn.edu.learnhub.learning.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.learning.client.ContentClient;
import vn.edu.learnhub.learning.dto.LearningDtos;
import vn.edu.learnhub.learning.entity.AssignmentSubmission;
import vn.edu.learnhub.learning.entity.Enrollment;
import vn.edu.learnhub.learning.entity.QuizAttempt;
import vn.edu.learnhub.learning.repository.AssignmentSubmissionRepository;
import vn.edu.learnhub.learning.repository.QuizAttemptRepository;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class AssessmentService {

    private final EnrollmentService enrollmentService;
    private final ContentClient contentClient;
    private final QuizAttemptRepository quizAttemptRepository;
    private final AssignmentSubmissionRepository submissionRepository;

    public AssessmentService(EnrollmentService enrollmentService,
                             ContentClient contentClient,
                             QuizAttemptRepository quizAttemptRepository,
                             AssignmentSubmissionRepository submissionRepository) {
        this.enrollmentService = enrollmentService;
        this.contentClient = contentClient;
        this.quizAttemptRepository = quizAttemptRepository;
        this.submissionRepository = submissionRepository;
    }

    @Transactional
    public LearningDtos.QuizResultDTO submitQuiz(Long userId, Long quizId, LearningDtos.QuizSubmitRequest request) {
        Enrollment enrollment = enrollmentService.requireEnrollment(userId, request.courseId());
        ContentClient.QuizAnswerKey key = contentClient.getQuizAnswerKey(quizId);

        if (key.questions() == null || key.questions().isEmpty()) {
            throw BusinessException.badRequest("Quiz chua co cau hoi");
        }

        int score = 0;
        Map<Long, String> answers = request.answers() == null ? Map.of() : request.answers();
        for (ContentClient.AnswerKeyItem item : key.questions()) {
            String given = answers.get(item.questionId());
            if (given != null && given.equalsIgnoreCase(item.correctOption())) {
                score++;
            }
        }

        int total = key.questions().size();
        int percent = total == 0 ? 0 : (int) Math.round(score * 100.0 / total);
        int passScore = key.passScore() == null ? 70 : key.passScore();
        boolean passed = percent >= passScore;

        QuizAttempt attempt = new QuizAttempt();
        attempt.setEnrollmentId(enrollment.getId());
        attempt.setQuizId(quizId);
        attempt.setScore(score);
        attempt.setTotal(total);
        attempt.setPassed(passed);
        quizAttemptRepository.save(attempt);

        return new LearningDtos.QuizResultDTO(quizId, score, total, percent, passed, passScore, Instant.now());
    }

    public List<LearningDtos.QuizResultDTO> myQuizAttempts(Long userId, Long courseId) {
        Enrollment enrollment = enrollmentService.requireEnrollment(userId, courseId);
        return quizAttemptRepository.findByEnrollmentIdOrderByCreatedAtDesc(enrollment.getId()).stream()
                .map(a -> new LearningDtos.QuizResultDTO(a.getQuizId(), a.getScore(), a.getTotal(),
                        a.getTotal() == 0 ? 0 : (int) Math.round(a.getScore() * 100.0 / a.getTotal()),
                        a.isPassed(), null, a.getCreatedAt()))
                .toList();
    }

    @Transactional
    public LearningDtos.SubmissionDTO submitAssignment(Long userId, Long assignmentId,
                                                       LearningDtos.AssignmentSubmitRequest request) {
        Enrollment enrollment = enrollmentService.requireEnrollment(userId, request.courseId());

        AssignmentSubmission submission = new AssignmentSubmission();
        submission.setEnrollmentId(enrollment.getId());
        submission.setAssignmentId(assignmentId);
        submission.setCourseId(request.courseId());
        submission.setLinkUrl(request.linkUrl().trim());
        submission.setNote(request.note());
        submission.setStatus(AssignmentSubmission.STATUS_SUBMITTED);
        submissionRepository.save(submission);
        return toSubmission(submission, userId);
    }

    public List<LearningDtos.SubmissionDTO> mySubmissions(Long userId, Long courseId) {
        Enrollment enrollment = enrollmentService.requireEnrollment(userId, courseId);
        return submissionRepository.findByEnrollmentIdOrderByCreatedAtDesc(enrollment.getId()).stream()
                .map(s -> toSubmission(s, userId))
                .toList();
    }

    public List<LearningDtos.SubmissionDTO> instructorSubmissions(Long courseId) {
        return submissionRepository.findByCourseIdOrderByCreatedAtDesc(courseId).stream()
                .map(s -> toSubmission(s, null))
                .toList();
    }

    @Transactional
    public LearningDtos.SubmissionDTO grade(Long submissionId, LearningDtos.GradeRequest request) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay bai nop"));
        CurrentUser.require();
        submission.setScore(request.score());
        submission.setFeedback(request.feedback());
        submission.setStatus(AssignmentSubmission.STATUS_GRADED);
        submission.setGradedAt(Instant.now());
        submissionRepository.save(submission);
        return toSubmission(submission, null);
    }

    private LearningDtos.SubmissionDTO toSubmission(AssignmentSubmission s, Long studentId) {
        return new LearningDtos.SubmissionDTO(s.getId(), s.getAssignmentId(), s.getCourseId(), studentId,
                s.getLinkUrl(), s.getNote(), s.getStatus(), s.getScore(), s.getFeedback(),
                s.getCreatedAt(), s.getGradedAt());
    }
}
