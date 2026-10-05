package vn.edu.learnhub.content.service;

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
import vn.edu.learnhub.content.notification.ContentNotificationService;
import vn.edu.learnhub.content.repository.AssignmentRepository;
import vn.edu.learnhub.content.repository.LectureRepository;
import vn.edu.learnhub.content.repository.QuizQuestionRepository;
import vn.edu.learnhub.content.repository.QuizRepository;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

/**
 * Kiem tra khoa noi dung curriculum khi chua dang nhap.
 * Sinh vien: Tran Thanh Binh (binh.pl.5b@gmail.com)
 */
@ExtendWith(MockitoExtension.class)
class ContentCurriculumLockTest {

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

    @Test
    @DisplayName("Chua dang nhap thi an videoUrl va bodyHtml trong curriculum")
    void curriculumHidesMediaWhenLocked() {
        Lecture lecture = new Lecture();
        lecture.setCourseId(8L);
        lecture.setTitle("Bai 1");
        lecture.setSortOrder(1);
        lecture.setType(Lecture.VIDEO);
        lecture.setVideoUrl("https://cdn.example/secret.mp4");
        lecture.setBodyHtml("<p>Noi dung</p>");
        lecture.setDurationSeconds(120);

        when(lectureRepository.findByCourseIdOrderBySortOrderAsc(8L)).thenReturn(List.of(lecture));
        when(quizRepository.findByCourseId(8L)).thenReturn(List.of());
        when(assignmentRepository.findByCourseId(8L)).thenReturn(List.of());

        ContentDtos.CurriculumDTO curriculum = contentService.getCurriculum(8L);

        assertEquals(1, curriculum.lectures().size());
        assertEquals("Bai 1", curriculum.lectures().get(0).title());
        assertNull(curriculum.lectures().get(0).videoUrl());
        assertNull(curriculum.lectures().get(0).bodyHtml());
        assertEquals(120, curriculum.lectures().get(0).durationSeconds());
    }
}
