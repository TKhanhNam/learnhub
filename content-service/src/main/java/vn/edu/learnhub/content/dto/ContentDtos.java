package vn.edu.learnhub.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public final class ContentDtos {
    private ContentDtos() {}

    public record LectureDTO(Long id, Long courseId, String title, int sortOrder, String type,
                             String videoUrl, String bodyHtml, int durationSeconds, String downloadUrl) {}
    public record LectureRequest(@NotBlank String title, String type, String videoUrl, String bodyHtml,
                                 Integer durationSeconds, String downloadUrl, Integer sortOrder) {}

    public record QuestionPublicDTO(Long id, String prompt, String optionA, String optionB,
                                    String optionC, String optionD) {}
    public record QuizDTO(Long id, Long courseId, String title, String kind, Integer passScore,
                          List<QuestionPublicDTO> questions) {}
    public record QuestionRequest(@NotBlank String prompt, @NotBlank String optionA, @NotBlank String optionB,
                                  String optionC, String optionD, @NotBlank String correctOption) {}
    public record QuizRequest(@NotBlank String title, String kind, Integer passScore,
                              List<QuestionRequest> questions) {}

    public record AssignmentDTO(Long id, Long courseId, String title, String instruction) {}
    public record AssignmentRequest(@NotBlank String title, String instruction) {}

    public record CurriculumDTO(Long courseId, List<LectureDTO> lectures, List<QuizDTO> quizzes,
                                List<AssignmentDTO> assignments) {}

    public record CourseContentStats(Long courseId, int lectureCount, int totalDurationSeconds) {}
    public record AnswerKeyItem(Long questionId, String correctOption) {}
    public record QuizAnswerKey(Long quizId, Long courseId, Integer passScore, List<AnswerKeyItem> questions) {}
    public record UploadMediaResponse(String objectName, String url) {}
}
