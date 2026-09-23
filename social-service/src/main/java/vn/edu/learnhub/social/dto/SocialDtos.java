package vn.edu.learnhub.social.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class SocialDtos {
    private SocialDtos() {}
    public record ReviewRequest(@NotNull Long courseId, @Min(1) @Max(5) int rating, String comment) {}
    public record ReplyRequest(@NotBlank String body) {}
    public record ReviewDTO(Long id, Long courseId, Long userId, String authorName, int rating, String comment,
                            String instructorReply, Instant createdAt) {}
    public record QuestionRequest(@NotNull Long courseId, Long lectureId, @NotBlank String title, @NotBlank String body) {}
    public record AnswerRequest(@NotBlank String body) {}
    public record AnswerDTO(Long id, Long questionId, Long userId, String authorName, String body, Instant createdAt) {}
    public record QuestionDTO(Long id, Long courseId, Long lectureId, Long userId, String authorName,
                              String title, String body, Instant createdAt, List<AnswerDTO> answers) {}
    public record AccessDTO(boolean hasAccess, Long enrollmentId, Integer progressPercent) {}
    public record PublicUser(Long id, String fullName, String headline, String avatarUrl, String role) {}
    public record RatingUpdate(BigDecimal ratingAvg, Integer ratingCount) {}
}
