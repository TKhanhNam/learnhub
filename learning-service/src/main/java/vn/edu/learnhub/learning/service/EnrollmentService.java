// path: learning-service/src/main/java/vn/edu/learnhub/learning/service/EnrollmentService.java
// purpose: cap quyen hoc (tron doi), kiem tra quyen truy cap, danh sach "Khoa hoc cua toi",
// tien do hoc va ghi chu.
//
// Diem quan trong ve bien gioi service: learning-service KHONG biet gia tien, KHONG biet
// thanh toan. No chi nhan lenh "cap quyen" tu commerce-service qua API noi bo.

package vn.edu.learnhub.learning.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.learning.client.CatalogClient;
import vn.edu.learnhub.learning.client.ContentClient;
import vn.edu.learnhub.learning.dto.LearningDtos;
import vn.edu.learnhub.learning.entity.Certificate;
import vn.edu.learnhub.learning.entity.Enrollment;
import vn.edu.learnhub.learning.entity.LearnerNote;
import vn.edu.learnhub.learning.entity.LessonProgress;
import vn.edu.learnhub.learning.repository.CertificateRepository;
import vn.edu.learnhub.learning.repository.EnrollmentRepository;
import vn.edu.learnhub.learning.repository.LearnerNoteRepository;
import vn.edu.learnhub.learning.repository.LessonProgressRepository;
import vn.edu.learnhub.platform.error.BusinessException;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class EnrollmentService {

    private static final Logger log = LoggerFactory.getLogger(EnrollmentService.class);

    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository progressRepository;
    private final LearnerNoteRepository noteRepository;
    private final CertificateRepository certificateRepository;
    private final CatalogClient catalogClient;
    private final ContentClient contentClient;

    public EnrollmentService(EnrollmentRepository enrollmentRepository,
                             LessonProgressRepository progressRepository,
                             LearnerNoteRepository noteRepository,
                             CertificateRepository certificateRepository,
                             CatalogClient catalogClient,
                             ContentClient contentClient) {
        this.enrollmentRepository = enrollmentRepository;
        this.progressRepository = progressRepository;
        this.noteRepository = noteRepository;
        this.certificateRepository = certificateRepository;
        this.catalogClient = catalogClient;
        this.contentClient = contentClient;
    }

    // ------------------------------------------------------------ cap / thu hoi quyen

    /**
     * Cap quyen hoc. Idempotent: goi nhieu lan cho cung 1 cap (user, course) khong tao ban trung,
     * nho vay Saga cua commerce-service co the thu lai an toan.
     */
    @Transactional
    public LearningDtos.GrantResultDTO grant(LearningDtos.GrantRequest request) {
        Optional<Enrollment> existing = enrollmentRepository
                .findByUserIdAndCourseId(request.userId(), request.courseId());

        if (existing.isPresent()) {
            return new LearningDtos.GrantResultDTO(existing.get().getId(), false);
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setUserId(request.userId());
        enrollment.setCourseId(request.courseId());
        enrollment.setSource(request.source() == null ? Enrollment.SOURCE_PURCHASE : request.source());
        enrollment.setOrderId(request.orderId());
        enrollment.setGrantedAt(Instant.now());
        enrollmentRepository.save(enrollment);

        // Cap nhat so luot dang ky ben catalog de hien thi tren trang ban.
        // Loi o buoc nay khong duoc lam that bai viec cap quyen hoc.
        try {
            catalogClient.increaseEnrollment(request.courseId(), 1);
        } catch (RuntimeException ex) {
            log.warn("Khong cap nhat duoc so luot dang ky cua khoa {}: {}",
                    request.courseId(), ex.getMessage());
        }

        return new LearningDtos.GrantResultDTO(enrollment.getId(), true);
    }

    /** Buoc compensate cua Saga: thanh toan that bai / hoan tien thi thu hoi quyen hoc. */
    @Transactional
    public void revoke(Long userId, Long courseId) {
        enrollmentRepository.findByUserIdAndCourseId(userId, courseId).ifPresent(enrollment -> {
            enrollmentRepository.delete(enrollment);
            try {
                catalogClient.increaseEnrollment(courseId, -1);
            } catch (RuntimeException ex) {
                log.warn("Khong giam duoc so luot dang ky cua khoa {}: {}", courseId, ex.getMessage());
            }
        });
    }

    public boolean hasAccess(Long userId, Long courseId) {
        return enrollmentRepository.existsByUserIdAndCourseId(userId, courseId);
    }

    public LearningDtos.AccessDTO checkAccess(Long userId, Long courseId) {
        return enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .map(enrollment -> new LearningDtos.AccessDTO(true, enrollment.getId(),
                        enrollment.getProgressPercent()))
                .orElse(new LearningDtos.AccessDTO(false, null, 0));
    }

    // ------------------------------------------------------------ khoa hoc cua toi

    public Page<LearningDtos.EnrolledCourseDTO> myCourses(Long userId, Pageable pageable) {
        Page<Enrollment> page = enrollmentRepository.findByUserIdOrderByGrantedAtDesc(userId, pageable);

        List<Long> courseIds = page.getContent().stream().map(Enrollment::getCourseId).toList();
        Map<Long, CatalogClient.CourseSnapshot> courses = loadCourses(courseIds);

        List<Long> enrollmentIds = page.getContent().stream().map(Enrollment::getId).toList();
        Map<Long, String> certificates = new HashMap<>();
        if (!enrollmentIds.isEmpty()) {
            certificateRepository.findByEnrollmentIdIn(enrollmentIds)
                    .forEach(certificate -> certificates.put(certificate.getEnrollmentId(), certificate.getCode()));
        }

        return page.map(enrollment -> {
            CatalogClient.CourseSnapshot course = courses.get(enrollment.getCourseId());
            long completed = progressRepository.countByEnrollmentIdAndCompletedTrue(enrollment.getId());
            return new LearningDtos.EnrolledCourseDTO(
                    enrollment.getId(),
                    enrollment.getCourseId(),
                    course == null ? "Khoa hoc #" + enrollment.getCourseId() : course.title(),
                    course == null ? null : course.slug(),
                    course == null ? null : course.thumbnailUrl(),
                    course == null ? null : course.instructorId(),
                    enrollment.getProgressPercent(),
                    enrollment.getTotalLectures(),
                    completed,
                    enrollment.getSource(),
                    enrollment.getGrantedAt(),
                    enrollment.getCompletedAt(),
                    certificates.get(enrollment.getId()));
        });
    }

    /**
     * Neu catalog-service dang tat, van tra ve danh sach khoa hoc (chi thieu ten/anh)
     * thay vi lam sap ca trang "Khoa hoc cua toi" - tinh huong demo cua Buoi 10.
     */
    private Map<Long, CatalogClient.CourseSnapshot> loadCourses(List<Long> courseIds) {
        if (courseIds.isEmpty()) {
            return Map.of();
        }
        try {
            Map<Long, CatalogClient.CourseSnapshot> map = new HashMap<>();
            catalogClient.getCourses(courseIds).forEach(course -> map.put(course.id(), course));
            return map;
        } catch (RuntimeException ex) {
            log.warn("Khong tai duoc thong tin khoa hoc tu catalog-service: {}", ex.getMessage());
            return Map.of();
        }
    }

    // ------------------------------------------------------------ tien do

    @Transactional
    public LearningDtos.ProgressDTO updateProgress(Long userId, LearningDtos.ProgressUpdateRequest request) {
        Enrollment enrollment = requireEnrollment(userId, request.courseId());

        LessonProgress progress = progressRepository
                .findByEnrollmentIdAndLectureId(enrollment.getId(), request.lectureId())
                .orElseGet(() -> {
                    LessonProgress created = new LessonProgress();
                    created.setEnrollmentId(enrollment.getId());
                    created.setLectureId(request.lectureId());
                    return created;
                });

        if (request.completed() != null) {
            progress.setCompleted(request.completed());
        }
        if (request.secondsWatched() != null
                && request.secondsWatched() > (progress.getSecondsWatched() == null ? 0 : progress.getSecondsWatched())) {
            progress.setSecondsWatched(request.secondsWatched());
        }
        progress.setUpdatedAt(Instant.now());
        progressRepository.save(progress);

        recalculate(enrollment);
        return buildProgress(enrollment);
    }

    public LearningDtos.ProgressDTO getProgress(Long userId, Long courseId) {
        return buildProgress(requireEnrollment(userId, courseId));
    }

    private void recalculate(Enrollment enrollment) {
        int totalLectures = enrollment.getTotalLectures() == null ? 0 : enrollment.getTotalLectures();
        try {
            ContentClient.CourseContentStats stats = contentClient.getStats(enrollment.getCourseId());
            if (stats != null && stats.lectureCount() > 0) {
                totalLectures = stats.lectureCount();
                enrollment.setTotalLectures(totalLectures);
            }
        } catch (RuntimeException ex) {
            log.warn("Khong lay duoc so bai giang cua khoa {}: {}", enrollment.getCourseId(), ex.getMessage());
        }

        long completed = progressRepository.countByEnrollmentIdAndCompletedTrue(enrollment.getId());
        int percent = totalLectures > 0
                ? (int) Math.min(100, Math.round(completed * 100.0 / totalLectures))
                : 0;

        enrollment.setProgressPercent(percent);
        if (percent >= 100 && enrollment.getCompletedAt() == null) {
            enrollment.setCompletedAt(Instant.now());
        }
        enrollmentRepository.save(enrollment);
    }

    private LearningDtos.ProgressDTO buildProgress(Enrollment enrollment) {
        List<LessonProgress> items = progressRepository.findByEnrollmentId(enrollment.getId());
        long completed = items.stream().filter(LessonProgress::isCompleted).count();

        return new LearningDtos.ProgressDTO(
                enrollment.getCourseId(),
                enrollment.getProgressPercent(),
                enrollment.getTotalLectures(),
                completed,
                items.stream()
                        .map(item -> new LearningDtos.LectureProgressDTO(item.getLectureId(),
                                item.isCompleted(), item.getSecondsWatched()))
                        .toList());
    }

    // ------------------------------------------------------------ ghi chu

    @Transactional
    public LearningDtos.NoteDTO addNote(Long userId, LearningDtos.NoteRequest request) {
        Enrollment enrollment = requireEnrollment(userId, request.courseId());

        LearnerNote note = new LearnerNote();
        note.setEnrollmentId(enrollment.getId());
        note.setLectureId(request.lectureId());
        note.setTimestampSeconds(request.timestampSeconds() == null ? 0 : request.timestampSeconds());
        note.setContent(request.content().trim());
        noteRepository.save(note);

        return toNoteDto(note);
    }

    public List<LearningDtos.NoteDTO> getNotes(Long userId, Long courseId) {
        Enrollment enrollment = requireEnrollment(userId, courseId);
        return noteRepository.findByEnrollmentIdOrderByCreatedAtDesc(enrollment.getId()).stream()
                .map(this::toNoteDto)
                .toList();
    }

    @Transactional
    public void deleteNote(Long userId, Long noteId) {
        LearnerNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay ghi chu"));

        Enrollment enrollment = enrollmentRepository.findById(note.getEnrollmentId())
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay ban ghi danh"));

        if (!enrollment.getUserId().equals(userId)) {
            throw BusinessException.forbidden("Ban chi duoc xoa ghi chu cua minh");
        }
        noteRepository.delete(note);
    }

    private LearningDtos.NoteDTO toNoteDto(LearnerNote note) {
        return new LearningDtos.NoteDTO(note.getId(), note.getLectureId(),
                note.getTimestampSeconds(), note.getContent(), note.getCreatedAt());
    }

    // ------------------------------------------------------------ dung chung

    public Enrollment requireEnrollment(Long userId, Long courseId) {
        return enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> BusinessException.forbidden(
                        "Ban chua so huu khoa hoc nay. Hay mua khoa hoc de bat dau hoc"));
    }

    public Optional<Certificate> findCertificate(Long enrollmentId) {
        return certificateRepository.findByEnrollmentId(enrollmentId);
    }

    /** Thong ke cho dashboard giang vien (goi qua API noi bo). */
    public LearningDtos.InstructorStatsDTO statsForCourses(List<Long> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) {
            return new LearningDtos.InstructorStatsDTO(0, 0, 0);
        }
        long total = enrollmentRepository.countByCourses(courseIds);
        long completed = enrollmentRepository.countCompletedByCourses(courseIds);
        Double average = enrollmentRepository.averageProgress(courseIds);
        return new LearningDtos.InstructorStatsDTO(total, completed, average == null ? 0 : average);
    }

    public long countByCourse(Long courseId) {
        return enrollmentRepository.countByCourseId(courseId);
    }

    public List<Enrollment> findByUser(Long userId) {
        return enrollmentRepository.findByUserId(userId);
    }

    public List<Enrollment> findByCourses(List<Long> courseIds) {
        return courseIds == null || courseIds.isEmpty()
                ? List.of()
                : enrollmentRepository.findByCourseIdIn(courseIds);
    }
}
