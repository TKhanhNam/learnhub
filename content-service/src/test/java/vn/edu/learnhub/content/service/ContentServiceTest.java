package vn.edu.learnhub.content.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.learnhub.content.client.CatalogInternalClient;
import vn.edu.learnhub.content.client.LearningInternalClient;
import vn.edu.learnhub.content.dto.ContentDtos;
import vn.edu.learnhub.content.entity.Lecture;
import vn.edu.learnhub.content.entity.Quiz;
import vn.edu.learnhub.content.notification.ContentNotificationService;
import vn.edu.learnhub.content.repository.AssignmentRepository;
import vn.edu.learnhub.content.repository.LectureRepository;
import vn.edu.learnhub.content.repository.QuizQuestionRepository;
import vn.edu.learnhub.content.repository.QuizRepository;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit Test kiểm thử phân hệ Quản lý Nội dung (content-service)
 * Sinh viên thực hiện: Lâm Thu Thùy (thuy1411 - 2311060387@hunre.edu.vn)
 */
@ExtendWith(MockitoExtension.class)
class ContentServiceTest {

    @Mock
    private LectureRepository lectureRepository;

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private QuizQuestionRepository questionRepository;

    @Mock
    private AssignmentRepository assignmentRepository;

    @Mock
    private CatalogInternalClient catalogClient;

    @Mock
    private LearningInternalClient learningClient;

    @Mock
    private ContentNotificationService notificationService;

    @InjectMocks
    private ContentService contentService;

    @BeforeEach
    void setUp() {
        // Mock default behavior if needed
    }

    @Test
    @DisplayName("Thêm bài giảng video thành công và kích hoạt notification")
    void testAddLectureVideoSuccess() {
        Long courseId = 1L;
        ContentDtos.LectureRequest request = new ContentDtos.LectureRequest(
                "Bài 1: Giới thiệu Microservices",
                "VIDEO",
                "http://minio:9000/content/video1.mp4",
                null,
                600,
                "http://minio:9000/content/slide1.pdf",
                1
        );

        when(lectureRepository.save(any(Lecture.class))).thenAnswer(invocation -> {
            Lecture l = invocation.getArgument(0);
            return l;
        });

        ContentDtos.LectureDTO result = contentService.addLecture(courseId, request);

        assertNotNull(result);
        assertEquals("Bài 1: Giới thiệu Microservices", result.title());
        assertEquals("VIDEO", result.type());
        verify(lectureRepository, times(1)).save(any(Lecture.class));
        verify(notificationService, times(1)).notifyNewLecture(eq(courseId), eq("Bài 1: Giới thiệu Microservices"), eq("VIDEO"));
    }

    @Test
    @DisplayName("Thêm Quiz kiểm tra thành công")
    void testAddQuizSuccess() {
        Long courseId = 1L;
        ContentDtos.QuestionRequest q = new ContentDtos.QuestionRequest(
                "MinIO là gì?", "Object Storage", "RDBMS", "Message Queue", "Gateway", "A"
        );
        ContentDtos.QuizRequest request = new ContentDtos.QuizRequest(
                "Quiz 1: Kiến thức lưu trữ", "QUIZ", 80, List.of(q)
        );

        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> {
            Quiz quiz = inv.getArgument(0);
            return quiz;
        });

        ContentDtos.QuizDTO result = contentService.addQuiz(courseId, request);

        assertNotNull(result);
        assertEquals("Quiz 1: Kiến thức lưu trữ", result.title());
        verify(quizRepository, times(1)).save(any(Quiz.class));
        verify(questionRepository, times(1)).save(any());
        verify(notificationService, times(1)).notifyNewQuiz(eq(courseId), eq("Quiz 1: Kiến thức lưu trữ"));
    }

    @Test
    @DisplayName("Thống kê thời lượng và số lượng bài giảng trong khóa học")
    void testCourseContentStats() {
        Long courseId = 2L;
        Lecture l1 = new Lecture();
        l1.setDurationSeconds(120);
        Lecture l2 = new Lecture();
        l2.setDurationSeconds(180);

        when(lectureRepository.findByCourseIdOrderBySortOrderAsc(courseId)).thenReturn(List.of(l1, l2));

        ContentDtos.CourseContentStats stats = contentService.stats(courseId);

        assertEquals(2, stats.lectureCount());
        assertEquals(300, stats.totalDurationSeconds());
    }
}
