package vn.edu.learnhub.assist.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;

public final class AssistDtos {
    private AssistDtos() {}
    public record HelpDTO(Long id, String slug, String title, String body, String locale, String audience) {}
    public record ChatRequest(
            @NotBlank String question,
            Long courseId,
            @jakarta.validation.constraints.Size(max = 8000) String briefing) {}
    public record ChatDTO(Long id, Long courseId, String question, String answer, Instant createdAt) {}
    public record FeeDTO(int extraPercent, String note) {}
    public record FeeUpdateRequest(@jakarta.validation.constraints.Min(0) @jakarta.validation.constraints.Max(30) int extraPercent) {}
    public record AiKeyDTO(int number, String provider, String model, String key, String state,
                           Instant restingUntil, String lastError, long answered) {}
}
