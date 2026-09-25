package vn.edu.learnhub.content.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.content.client.CatalogInternalClient;
import vn.edu.learnhub.content.client.LearningInternalClient;
import vn.edu.learnhub.content.dto.ContentDtos;
import vn.edu.learnhub.content.entity.Assignment;
import vn.edu.learnhub.content.entity.Lecture;
import vn.edu.learnhub.content.entity.Quiz;
import vn.edu.learnhub.content.entity.QuizQuestion;
import vn.edu.learnhub.content.repository.AssignmentRepository;
import vn.edu.learnhub.content.repository.LectureRepository;
import vn.edu.learnhub.content.repository.QuizQuestionRepository;
import vn.edu.learnhub.content.repository.QuizRepository;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.AuthUser;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.util.List;

@Service
public class ContentService {
    private static final String SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

    private final LectureRepository lectureRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository questionRepository;
    private final AssignmentRepository assignmentRepository;
    private final CatalogInternalClient catalogClient;
    private final LearningInternalClient learningClient;
    private final vn.edu.learnhub.content.notification.ContentNotificationService notificationService;

    public ContentService(LectureRepository lectureRepository, QuizRepository quizRepository,
                          QuizQuestionRepository questionRepository, AssignmentRepository assignmentRepository,
                          CatalogInternalClient catalogClient, LearningInternalClient learningClient,
                          vn.edu.learnhub.content.notification.ContentNotificationService notificationService) {
        this.lectureRepository = lectureRepository;
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.assignmentRepository = assignmentRepository;
        this.catalogClient = catalogClient;
        this.learningClient = learningClient;
        this.notificationService = notificationService;
    }

    public ContentDtos.CurriculumDTO getCurriculum(Long courseId) {
        boolean unlocked = canUnlock(courseId);
        List<ContentDtos.LectureDTO> lectures = lectureRepository.findByCourseIdOrderBySortOrderAsc(courseId)
                .stream().map(l -> toLecture(l, unlocked)).toList();
        List<ContentDtos.QuizDTO> quizzes = quizRepository.findByCourseId(courseId).stream()
                .map(q -> toQuiz(q, unlocked)).toList();
        List<ContentDtos.AssignmentDTO> assignments = assignmentRepository.findByCourseId(courseId).stream()
                .map(this::toAssignment).toList();
        return new ContentDtos.CurriculumDTO(courseId, lectures, quizzes, assignments);
    }

    @Transactional
    public ContentDtos.LectureDTO addLecture(Long courseId, ContentDtos.LectureRequest req) {
        assertOwner(courseId);
        Lecture l = new Lecture();
        l.setCourseId(courseId);
        apply(l, req);
        lectureRepository.save(l);
        notificationService.notifyNewLecture(courseId, l.getTitle(), l.getType());
        return toLecture(l, true);
    }

    @Transactional
    public ContentDtos.LectureDTO updateLecture(Long id, ContentDtos.LectureRequest req) {
        Lecture l = lectureRepository.findById(id).orElseThrow(() -> BusinessException.notFound("Khong tim thay bai giang"));
        assertOwner(l.getCourseId());
        apply(l, req);
        lectureRepository.save(l);
        return toLecture(l, true);
    }

    @Transactional
    public void deleteLecture(Long id) {
        Lecture l = lectureRepository.findById(id).orElseThrow(() -> BusinessException.notFound("Khong tim thay bai giang"));
        assertOwner(l.getCourseId());
        lectureRepository.delete(l);
    }

    @Transactional
    public ContentDtos.QuizDTO addQuiz(Long courseId, ContentDtos.QuizRequest req) {
        assertOwner(courseId);
        Quiz quiz = new Quiz();
        quiz.setCourseId(courseId);
        quiz.setTitle(req.title());
        quiz.setKind(req.kind() == null ? "QUIZ" : req.kind());
        quiz.setPassScore(req.passScore() == null ? 70 : req.passScore());
        quizRepository.save(quiz);
        if (req.questions() != null) {
            for (ContentDtos.QuestionRequest q : req.questions()) {
                QuizQuestion item = new QuizQuestion();
                item.setQuizId(quiz.getId());
                item.setPrompt(q.prompt());
                item.setOptionA(q.optionA());
                item.setOptionB(q.optionB());
                item.setOptionC(q.optionC());
                item.setOptionD(q.optionD());
                item.setCorrectOption(q.correctOption().toUpperCase());
                questionRepository.save(item);
            }
        }
        notificationService.notifyNewQuiz(courseId, quiz.getTitle());
        return toQuiz(quiz, true);
    }

    @Transactional
    public ContentDtos.AssignmentDTO addAssignment(Long courseId, ContentDtos.AssignmentRequest req) {
        assertOwner(courseId);
        Assignment a = new Assignment();
        a.setCourseId(courseId);
        a.setTitle(req.title());
        a.setInstruction(req.instruction());
        assignmentRepository.save(a);
        notificationService.notifyNewAssignment(courseId, a.getTitle());
        return toAssignment(a);
    }

    public ContentDtos.CourseContentStats stats(Long courseId) {
        List<Lecture> lectures = lectureRepository.findByCourseIdOrderBySortOrderAsc(courseId);
        int duration = lectures.stream().mapToInt(Lecture::getDurationSeconds).sum();
        return new ContentDtos.CourseContentStats(courseId, lectures.size(), duration);
    }

    public ContentDtos.QuizAnswerKey answerKey(Long quizId) {
        Quiz quiz = quizRepository.findById(quizId).orElseThrow(() -> BusinessException.notFound("Khong tim thay quiz"));
        List<ContentDtos.AnswerKeyItem> items = questionRepository.findByQuizId(quizId).stream()
                .map(q -> new ContentDtos.AnswerKeyItem(q.getId(), q.getCorrectOption()))
                .toList();
        return new ContentDtos.QuizAnswerKey(quiz.getId(), quiz.getCourseId(), quiz.getPassScore(), items);
    }

    @Transactional
    public void seedIfEmpty() {
        if (lectureRepository.count() == 0) {
            for (long courseId = 1; courseId <= 10; courseId++) {
                seedCore(courseId);
            }
        }
        for (long courseId = 1; courseId <= 10; courseId++) {
            if (lectureRepository.countByCourseId(courseId) == 0) {
                continue;
            }
            boolean hasPractice = quizRepository.findByCourseId(courseId).stream()
                    .anyMatch(q -> "PRACTICE".equalsIgnoreCase(q.getKind()));
            if (!hasPractice) {
                Quiz practice = new Quiz();
                practice.setCourseId(courseId);
                practice.setTitle("Practice test - On thi");
                practice.setKind("PRACTICE");
                practice.setPassScore(80);
                quizRepository.save(practice);
                QuizQuestion q1 = new QuizQuestion();
                q1.setQuizId(practice.getId());
                q1.setPrompt("Ban can hoan thanh bai nao truoc khi lam practice test?");
                q1.setOptionA("Khong can bai nao");
                q1.setOptionB("Cac bai giang va quiz trong khoa");
                q1.setOptionC("Chi xem trailer");
                q1.setOptionD("Chi doc review");
                q1.setCorrectOption("B");
                questionRepository.save(q1);
            }
            boolean hasCoding = assignmentRepository.findByCourseId(courseId).stream()
                    .anyMatch(a -> a.getTitle() != null && a.getTitle().toLowerCase().contains("coding"));
            if (!hasCoding) {
                Assignment coding = new Assignment();
                coding.setCourseId(courseId);
                coding.setTitle("Coding exercise - nop link GitHub");
                coding.setInstruction("Lam bai tap lap trinh, day len GitHub (public) roi dan link repository.");
                assignmentRepository.save(coding);
            }
        }
    }

    private void seedCore(long courseId) {
            Lecture intro = new Lecture();
            intro.setCourseId(courseId);
            intro.setTitle("Bai 1 - Gioi thieu khoa hoc");
            intro.setSortOrder(1);
            intro.setType(Lecture.VIDEO);
            intro.setVideoUrl(SAMPLE_VIDEO);
            intro.setDurationSeconds(90);
            intro.setDownloadUrl("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf");
            lectureRepository.save(intro);

            Lecture text = new Lecture();
            text.setCourseId(courseId);
            text.setTitle("Bai 2 - Tai lieu tom tat");
            text.setSortOrder(2);
            text.setType(Lecture.TEXT);
            text.setBodyHtml("<p>Tom tat kien thuc chinh cua khoa hoc. Doc xong hay lam quiz.</p>");
            text.setDurationSeconds(300);
            lectureRepository.save(text);

            Quiz quiz = new Quiz();
            quiz.setCourseId(courseId);
            quiz.setTitle("Quiz kiem tra bai 1");
            quiz.setKind("QUIZ");
            quiz.setPassScore(70);
            quizRepository.save(quiz);
            QuizQuestion q1 = new QuizQuestion();
            q1.setQuizId(quiz.getId());
            q1.setPrompt("Microservices nen tach CSDL theo cach nao?");
            q1.setOptionA("Mot DB dung chung");
            q1.setOptionB("Moi service mot DB");
            q1.setOptionC("Chi dung Redis");
            q1.setOptionD("Khong can DB");
            q1.setCorrectOption("B");
            questionRepository.save(q1);
            QuizQuestion q2 = new QuizQuestion();
            q2.setQuizId(quiz.getId());
            q2.setPrompt("Frontend chi duoc goi vao dau?");
            q2.setOptionA("Thang vao tung service");
            q2.setOptionB("API Gateway");
            q2.setOptionC("Truc tiep MySQL");
            q2.setOptionD("MinIO");
            q2.setCorrectOption("B");
            questionRepository.save(q2);

            Assignment asg = new Assignment();
            asg.setCourseId(courseId);
            asg.setTitle("Bai tap nop link GitHub");
            asg.setInstruction("Lam mot service nho roi dan link repository.");
            assignmentRepository.save(asg);
    }

    private void apply(Lecture l, ContentDtos.LectureRequest req) {
        l.setTitle(req.title());
        l.setType(req.type() == null ? Lecture.VIDEO : req.type());
        l.setVideoUrl(req.videoUrl() == null || req.videoUrl().isBlank() ? SAMPLE_VIDEO : req.videoUrl());
        l.setBodyHtml(req.bodyHtml());
        l.setDurationSeconds(req.durationSeconds() == null ? 0 : req.durationSeconds());
        l.setDownloadUrl(req.downloadUrl());
        if (req.sortOrder() != null) l.setSortOrder(req.sortOrder());
    }

    private void assertOwner(Long courseId) {
        AuthUser user = CurrentUser.require();
        if (user.isAdmin()) return;
        CatalogInternalClient.Snapshot snap = catalogClient.getCourse(courseId);
        CurrentUser.requireOwnerOrAdmin(snap.instructorId(), "Ban chi duoc sua noi dung khoa hoc cua minh");
    }

    private boolean canUnlock(Long courseId) {
        AuthUser user = CurrentUser.get();
        if (user == null) return false;
        if (user.isAdmin()) return true;
        try {
            CatalogInternalClient.Snapshot snap = catalogClient.getCourse(courseId);
            if (snap.instructorId().equals(user.userId())) return true;
        } catch (RuntimeException ignored) { }
        return learningClient.hasAccess(user.userId(), courseId);
    }

    private ContentDtos.LectureDTO toLecture(Lecture l, boolean unlocked) {
        return new ContentDtos.LectureDTO(l.getId(), l.getCourseId(), l.getTitle(), l.getSortOrder(), l.getType(),
                unlocked ? l.getVideoUrl() : null, unlocked ? l.getBodyHtml() : null,
                l.getDurationSeconds(), unlocked ? l.getDownloadUrl() : null);
    }

    private ContentDtos.QuizDTO toQuiz(Quiz quiz, boolean unlocked) {
        List<ContentDtos.QuestionPublicDTO> questions = questionRepository.findByQuizId(quiz.getId()).stream()
                .map(q -> new ContentDtos.QuestionPublicDTO(q.getId(), q.getPrompt(), q.getOptionA(),
                        q.getOptionB(), q.getOptionC(), q.getOptionD()))
                .toList();
        return new ContentDtos.QuizDTO(quiz.getId(), quiz.getCourseId(), quiz.getTitle(), quiz.getKind(),
                quiz.getPassScore(), unlocked ? questions : List.of());
    }

    private ContentDtos.AssignmentDTO toAssignment(Assignment a) {
        return new ContentDtos.AssignmentDTO(a.getId(), a.getCourseId(), a.getTitle(), a.getInstruction());
    }
}
