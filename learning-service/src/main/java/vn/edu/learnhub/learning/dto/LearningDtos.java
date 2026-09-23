// path: learning-service/src/main/java/vn/edu/learnhub/learning/dto/LearningDtos.java
// purpose: hop dong du lieu cua learning-service.

package vn.edu.learnhub.learning.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class LearningDtos {

    private LearningDtos() {
    }

    public record EnrolledCourseDTO(
            Long enrollmentId,
            Long courseId,
            String courseTitle,
            String courseSlug,
            String thumbnailUrl,
            Long instructorId,
            Integer progressPercent,
            Integer totalLectures,
            long completedLectures,
            String source,
            Instant grantedAt,
            Instant completedAt,
            String certificateCode) {
    }

    public record AccessDTO(boolean hasAccess, Long enrollmentId, Integer progressPercent) {
    }

    public record ProgressUpdateRequest(
            @NotNull(message = "Thieu ma khoa hoc") Long courseId,
            @NotNull(message = "Thieu ma bai giang") Long lectureId,
            Boolean completed,
            @Min(value = 0, message = "So giay da xem khong duoc am") Integer secondsWatched) {
    }

    public record LectureProgressDTO(Long lectureId, boolean completed, Integer secondsWatched) {
    }

    public record ProgressDTO(
            Long courseId,
            Integer progressPercent,
            Integer totalLectures,
            long completedLectures,
            List<LectureProgressDTO> lectures) {
    }

    public record NoteRequest(
            @NotNull(message = "Thieu ma khoa hoc") Long courseId,
            @NotNull(message = "Thieu ma bai giang") Long lectureId,
            @Min(value = 0, message = "Moc thoi gian khong duoc am") Integer timestampSeconds,
            @NotBlank(message = "Noi dung ghi chu khong duoc de trong")
            @Size(max = 2000, message = "Ghi chu toi da 2000 ky tu") String content) {
    }

    public record NoteDTO(Long id, Long lectureId, Integer timestampSeconds, String content, Instant createdAt) {
    }

    public record QuizSubmitRequest(
            @NotNull(message = "Thieu ma khoa hoc") Long courseId,
            @NotNull(message = "Chua co cau tra loi nao") Map<Long, String> answers) {
    }

    public record QuizResultDTO(
            Long quizId,
            Integer score,
            Integer total,
            int percent,
            boolean passed,
            Integer passScore,
            Instant createdAt) {
    }

    public record AssignmentSubmitRequest(
            @NotNull(message = "Thieu ma khoa hoc") Long courseId,
            @NotBlank(message = "Phai nhap link bai lam")
            @Size(max = 500, message = "Link toi da 500 ky tu") String linkUrl,
            @Size(max = 500, message = "Ghi chu toi da 500 ky tu") String note) {
    }

    public record SubmissionDTO(
            Long id,
            Long assignmentId,
            Long courseId,
            Long studentId,
            String linkUrl,
            String note,
            String status,
            Integer score,
            String feedback,
            Instant createdAt,
            Instant gradedAt) {
    }

    public record GradeRequest(
            @NotNull(message = "Phai nhap diem")
            @Min(value = 0, message = "Diem tu 0 den 100")
            @Max(value = 100, message = "Diem tu 0 den 100") Integer score,
            @Size(max = 500, message = "Nhan xet toi da 500 ky tu") String feedback) {
    }

    public record CertificateDTO(
            String code,
            Long courseId,
            String courseTitle,
            String pdfStatus,
            Instant issuedAt) {
    }

    /** commerce-service / org-service goi sang qua API noi bo de cap quyen hoc. */
    public record GrantRequest(
            @NotNull(message = "Thieu ma nguoi dung") Long userId,
            @NotNull(message = "Thieu ma khoa hoc") Long courseId,
            String source,
            Long orderId) {
    }

    public record GrantResultDTO(Long enrollmentId, boolean created) {
    }

    public record InstructorStatsDTO(long totalEnrollments, long completedEnrollments, double averageProgress) {
    }
}
