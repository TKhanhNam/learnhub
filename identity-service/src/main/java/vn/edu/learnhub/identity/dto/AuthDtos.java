// path: identity-service/src/main/java/vn/edu/learnhub/identity/dto/AuthDtos.java
// purpose: DTO cho luong xac thuc. KHONG bao gio tra Entity ra ngoai API (Buoi 2):
// entity co password_hash, tra ra ngoai la lo thong tin nhay cam.

package vn.edu.learnhub.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank(message = "Ten dang nhap khong duoc de trong")
            @Size(min = 3, max = 60, message = "Ten dang nhap tu 3 den 60 ky tu")
            @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Ten dang nhap chi gom chu, so, dau . _ -")
            String username,

            @NotBlank(message = "Email khong duoc de trong")
            @Email(message = "Email khong dung dinh dang")
            String email,

            @NotBlank(message = "Ho ten khong duoc de trong")
            @Size(max = 160, message = "Ho ten toi da 160 ky tu")
            String fullName,

            @NotBlank(message = "Mat khau khong duoc de trong")
            @Size(min = 6, max = 72, message = "Mat khau tu 6 den 72 ky tu")
            String password,

            // Chi cho phep dang ky STUDENT hoac INSTRUCTOR; ADMIN/ORG_ADMIN do admin cap
            String role) {
    }

    public record LoginRequest(
            @NotBlank(message = "Ten dang nhap khong duoc de trong") String username,
            @NotBlank(message = "Mat khau khong duoc de trong") String password) {
    }

    public record RefreshRequest(String refreshToken) {
    }

    /** Tra ve cho Frontend sau khi dang nhap/dang ky/refresh thanh cong. */
    public record TokenResponse(
            Long userId,
            String username,
            String fullName,
            String role,
            String accessToken,
            String refreshToken,
            long accessExpiresInMs) {
    }
}
