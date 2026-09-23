package vn.edu.learnhub.org.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public final class OrgDtos {
    private OrgDtos() {}
    public record PlanDTO(String code, String name, int seats, String priceLabel) {}
    public record DemoRequestBody(@NotBlank String company, @Email @NotBlank String contactEmail, String message) {}
    public record DemoDTO(Long id, String company, String contactEmail, String message, String status, Instant createdAt) {}
    public record OrgDTO(Long id, String name, String plan, int seatLimit, long memberCount, Long ownerId) {}
    public record CreateOrgRequest(@NotBlank String name, String plan) {}
    public record MemberRequest(@NotNull Long userId, String role) {}
    public record MemberDTO(Long id, Long userId, String role) {}
    public record PathRequest(@NotBlank String title, @NotNull List<Long> courseIds) {}
    public record PathDTO(Long id, String title, List<Long> courseIds) {}
    public record AssignRequest(@NotNull Long userId, @NotNull Long courseId) {}
    public record GrantRequest(Long userId, Long courseId, String source, Long orderId) {}
    public record ReportDTO(long members, long paths, String plan) {}
}
