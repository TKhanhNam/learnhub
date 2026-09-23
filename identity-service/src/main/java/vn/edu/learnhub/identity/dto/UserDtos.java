package vn.edu.learnhub.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserDTO(
            Long id,
            String username,
            String email,
            String fullName,
            String role,
            boolean locked,
            String lockReason,
            Instant lockedAt,
            Long lockedBy,
            String headline,
            String bio,
            String avatarUrl,
            String language,
            Instant createdAt) {
    }

    public record PublicUserDTO(Long id, String fullName, String headline, String avatarUrl, String role) {
    }

    public record UpdateProfileRequest(
            @NotBlank(message = "Ho ten khong duoc de trong")
            @Size(max = 160, message = "Ho ten toi da 160 ky tu") String fullName,
            @Size(max = 200, message = "Tieu de gioi thieu toi da 200 ky tu") String headline,
            String bio,
            @Size(max = 400, message = "Duong dan anh toi da 400 ky tu") String avatarUrl,
            String language) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Mat khau hien tai khong duoc de trong") String currentPassword,
            @NotBlank(message = "Mat khau moi khong duoc de trong")
            @Size(min = 6, max = 72, message = "Mat khau moi tu 6 den 72 ky tu") String newPassword) {
    }

    public record UpdateRoleRequest(
            @NotBlank(message = "Vai tro khong duoc de trong") String role) {
    }

    public record LockRequest(
            @NotNull(message = "Thieu trang thai khoa") Boolean locked,
            @Size(max = 1000, message = "Ly do toi da 1000 ky tu") String reason) {
    }

    public record AdminStatsDTO(
            long totalUsers,
            long students,
            long instructors,
            long admins,
            long orgAdmins,
            long lockedUsers) {
    }

    public record MailLogDTO(
            Long id,
            String recipient,
            String subject,
            String body,
            String status,
            String errorMessage,
            Long relatedUserId,
            Instant createdAt) {
    }
}
