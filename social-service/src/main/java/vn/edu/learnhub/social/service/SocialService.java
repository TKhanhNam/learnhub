package vn.edu.learnhub.social.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.platform.client.ServiceClient;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.AuthUser;
import vn.edu.learnhub.platform.security.CurrentUser;
import vn.edu.learnhub.social.dto.SocialDtos;
import vn.edu.learnhub.social.entity.Answer;
import vn.edu.learnhub.social.entity.Question;
import vn.edu.learnhub.social.entity.Review;
import vn.edu.learnhub.social.repository.AnswerRepository;
import vn.edu.learnhub.social.repository.QuestionRepository;
import vn.edu.learnhub.social.repository.ReviewRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SocialService {

    private final ReviewRepository reviewRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ServiceClient serviceClient;
    private final String learningUrl;
    private final String catalogUrl;
    private final String identityUrl;

    public SocialService(ReviewRepository reviewRepository,
                         QuestionRepository questionRepository,
                         AnswerRepository answerRepository,
                         ServiceClient serviceClient,
                         @Value("${services.learning-internal-url}") String learningUrl,
                         @Value("${services.catalog-internal-url}") String catalogUrl,
                         @Value("${services.identity-internal-url}") String identityUrl) {
        this.reviewRepository = reviewRepository;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.serviceClient = serviceClient;
        this.learningUrl = learningUrl;
        this.catalogUrl = catalogUrl;
        this.identityUrl = identityUrl;
    }

    public List<SocialDtos.ReviewDTO> listReviews(Long courseId) {
        List<Review> reviews = reviewRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        Map<Long, String> names = names(reviews.stream().map(Review::getUserId).toList());
        return reviews.stream().map(r -> toReview(r, names.getOrDefault(r.getUserId(), "Hoc vien"))).toList();
    }

    @Transactional
    public SocialDtos.ReviewDTO addReview(Long userId, SocialDtos.ReviewRequest request) {
        requireAccess(userId, request.courseId());
        Review review = reviewRepository.findByCourseIdAndUserId(request.courseId(), userId).orElseGet(Review::new);
        review.setCourseId(request.courseId());
        review.setUserId(userId);
        review.setRating(request.rating());
        review.setComment(request.comment());
        review = reviewRepository.save(review);
        refreshRating(request.courseId());
        return toReview(review, displayName(userId));
    }

    @Transactional
    public SocialDtos.ReviewDTO replyReview(Long userId, Long reviewId, String body) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay danh gia"));
        requireInstructorOf(userId, review.getCourseId());
        review.setInstructorReply(body.trim());
        return toReview(reviewRepository.save(review), displayName(review.getUserId()));
    }

    public List<SocialDtos.QuestionDTO> listQuestions(Long courseId) {
        return questionRepository.findByCourseIdOrderByCreatedAtDesc(courseId).stream()
                .map(this::toQuestion).toList();
    }

    @Transactional
    public SocialDtos.QuestionDTO addQuestion(Long userId, SocialDtos.QuestionRequest request) {
        requireAccess(userId, request.courseId());
        Question question = new Question();
        question.setCourseId(request.courseId());
        question.setLectureId(request.lectureId());
        question.setUserId(userId);
        question.setTitle(request.title().trim());
        question.setBody(request.body().trim());
        return toQuestion(questionRepository.save(question));
    }

    @Transactional
    public SocialDtos.AnswerDTO addAnswer(Long userId, Long questionId, SocialDtos.AnswerRequest request) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay cau hoi"));
        requireAccess(userId, question.getCourseId());
        Answer answer = new Answer();
        answer.setQuestionId(questionId);
        answer.setUserId(userId);
        answer.setBody(request.body().trim());
        answer = answerRepository.save(answer);
        return new SocialDtos.AnswerDTO(answer.getId(), questionId, userId, displayName(userId),
                answer.getBody(), answer.getCreatedAt());
    }

    private SocialDtos.QuestionDTO toQuestion(Question question) {
        List<SocialDtos.AnswerDTO> answers = answerRepository.findByQuestionIdOrderByCreatedAtAsc(question.getId())
                .stream()
                .map(a -> new SocialDtos.AnswerDTO(a.getId(), a.getQuestionId(), a.getUserId(),
                        displayName(a.getUserId()), a.getBody(), a.getCreatedAt()))
                .toList();
        return new SocialDtos.QuestionDTO(question.getId(), question.getCourseId(), question.getLectureId(),
                question.getUserId(), displayName(question.getUserId()), question.getTitle(), question.getBody(),
                question.getCreatedAt(), answers);
    }

    private SocialDtos.ReviewDTO toReview(Review review, String authorName) {
        return new SocialDtos.ReviewDTO(review.getId(), review.getCourseId(), review.getUserId(),
                authorName, review.getRating(), review.getComment(), review.getInstructorReply(),
                review.getCreatedAt());
    }

    private void requireAccess(Long userId, Long courseId) {
        if (ownsCourse(userId, courseId)) {
            return;
        }
        SocialDtos.AccessDTO access = serviceClient.get("learning",
                learningUrl + "/internal/enrollments/access?userId=" + userId + "&courseId=" + courseId,
                SocialDtos.AccessDTO.class);
        if (access == null || !access.hasAccess()) {
            throw BusinessException.forbidden("Ban can so huu khoa hoc de danh gia hoac hoi dap");
        }
    }

    private void requireInstructorOf(Long userId, Long courseId) {
        AuthUser user = CurrentUser.get();
        if (user != null && user.isAdmin()) {
            return;
        }
        if (!ownsCourse(userId, courseId)) {
            throw BusinessException.forbidden("Chi giang vien cua khoa moi duoc phan hoi");
        }
    }

    private boolean ownsCourse(Long userId, Long courseId) {
        AuthUser user = CurrentUser.get();
        if (user != null && user.isAdmin()) {
            return true;
        }
        try {
            CourseSnap snap = serviceClient.get("catalog", catalogUrl + "/internal/courses/" + courseId,
                    CourseSnap.class);
            return snap != null && userId.equals(snap.instructorId());
        } catch (Exception ex) {
            return false;
        }
    }

    private record CourseSnap(Long id, Long instructorId) {
    }

    private void refreshRating(Long courseId) {
        List<Review> reviews = reviewRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        if (reviews.isEmpty()) {
            return;
        }
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
        serviceClient.patch("catalog", catalogUrl + "/internal/courses/" + courseId + "/rating",
                new SocialDtos.RatingUpdate(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP), reviews.size()),
                Void.class);
    }

    private String displayName(Long userId) {
        return names(List.of(userId)).getOrDefault(userId, "Hoc vien");
    }

    private Map<Long, String> names(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        try {
            SocialDtos.PublicUser[] users = serviceClient.post("identity", identityUrl + "/internal/users/bulk",
                    ids, SocialDtos.PublicUser[].class);
            if (users == null) {
                return Map.of();
            }
            return java.util.Arrays.stream(users)
                    .collect(Collectors.toMap(SocialDtos.PublicUser::id, SocialDtos.PublicUser::fullName, (a, b) -> a));
        } catch (Exception ex) {
            return Map.of();
        }
    }
}
