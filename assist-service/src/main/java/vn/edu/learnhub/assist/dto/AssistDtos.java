package vn.edu.learnhub.assist.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public final class AssistDtos {
    private AssistDtos() {}
    public record HelpDTO(Long id, String slug, String title, String body, String locale) {}
    public record ChatRequest(@NotBlank String question, Long courseId) {}
    public record ChatDTO(Long id, Long courseId, String question, String answer, Instant createdAt) {}
}
