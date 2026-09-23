// path: identity-service/src/main/java/vn/edu/learnhub/identity/service/AuthService.java
// purpose: logic dang ky / dang nhap / refresh / logout.
// Chua toan bo nghiep vu, khong biet gi ve HTTP (Buoi 2 - tach 3 lop).

package vn.edu.learnhub.identity.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.identity.dto.AuthDtos;
import vn.edu.learnhub.identity.entity.AppUser;
import vn.edu.learnhub.identity.entity.RefreshToken;
import vn.edu.learnhub.identity.repository.AppUserRepository;
import vn.edu.learnhub.identity.repository.RefreshTokenRepository;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.JwtService;

import io.jsonwebtoken.Claims;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(AppUserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthDtos.TokenResponse register(AuthDtos.RegisterRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw BusinessException.conflict("Ten dang nhap da duoc su dung");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw BusinessException.conflict("Email da duoc su dung");
        }

        String role = (request.role() == null || request.role().isBlank())
                ? Roles.STUDENT
                : request.role().trim().toUpperCase();
        if (!Roles.SELF_SIGNUP.contains(role)) {
            throw BusinessException.badRequest("Chi duoc dang ky voi vai tro STUDENT hoac INSTRUCTOR");
        }

        AppUser user = new AppUser();
        user.setUsername(request.username().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setFullName(request.fullName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(role);
        user.setCreatedAt(Instant.now());

        userRepository.save(user);
        return issueTokens(user);
    }

    @Transactional
    public AuthDtos.TokenResponse login(AuthDtos.LoginRequest request) {
        String login = request.username().trim();
        AppUser user = userRepository.findByUsername(login)
                .or(() -> userRepository.findByEmailIgnoreCase(login))
                // Thong bao chung chung: khong tiet lo "username khong ton tai" de tranh do tai khoan
                .orElseThrow(() -> BusinessException.unauthorized("Sai tai khoan hoac mat khau"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw BusinessException.unauthorized("Sai tai khoan hoac mat khau");
        }
        if (user.isLocked()) {
            String reason = user.getLockReason();
            String detail = (reason == null || reason.isBlank())
                    ? "Tai khoan da bi khoa, vui long lien he ho tro"
                    : "Tai khoan da bi khoa. Ly do: " + reason;
            throw BusinessException.forbidden(detail);
        }

        return issueTokens(user);
    }

    /**
     * Xoay vong refresh token: token cu bi thu hoi ngay, phat token moi.
     * Neu ai do dung lai token cu (da bi thu hoi) thi bi tu choi.
     */
    @Transactional
    public AuthDtos.TokenResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw BusinessException.unauthorized("Thieu refresh token");
        }

        Claims claims;
        try {
            claims = jwtService.parse(refreshToken);
        } catch (Exception ex) {
            throw BusinessException.unauthorized("Refresh token khong hop le hoac da het han");
        }

        if (!JwtService.TYPE_REFRESH.equals(claims.get(JwtService.CLAIM_TYPE, String.class))) {
            throw BusinessException.unauthorized("Token gui len khong phai refresh token");
        }

        RefreshToken stored = refreshTokenRepository.findByJti(claims.getId())
                .orElseThrow(() -> BusinessException.unauthorized("Refresh token khong ton tai"));

        if (stored.isRevoked()) {
            throw BusinessException.unauthorized("Refresh token da bi thu hoi, vui long dang nhap lai");
        }
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw BusinessException.unauthorized("Refresh token da het han, vui long dang nhap lai");
        }
        if (!stored.getTokenHash().equals(sha256(refreshToken))) {
            throw BusinessException.unauthorized("Refresh token khong khop");
        }

        AppUser user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> BusinessException.unauthorized("Tai khoan khong ton tai"));
        if (user.isLocked()) {
            throw BusinessException.forbidden("Tai khoan da bi khoa");
        }

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokens(user);
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        try {
            Claims claims = jwtService.parse(refreshToken);
            refreshTokenRepository.findByJti(claims.getId()).ifPresent(stored -> {
                stored.setRevoked(true);
                refreshTokenRepository.save(stored);
            });
        } catch (Exception ignored) {
            // token da het han/khong doc duoc thi coi nhu da dang xuat
        }
    }

    /** Doi mat khau => thu hoi TOAN BO refresh token cua nguoi dung (yeu cau file cong nghe loi). */
    @Transactional
    public void revokeAllTokens(Long userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    private AuthDtos.TokenResponse issueTokens(AppUser user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getUsername(), user.getRole());

        String jti = JwtService.newJti();
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getUsername(), jti);

        RefreshToken stored = new RefreshToken();
        stored.setJti(jti);
        stored.setUserId(user.getId());
        stored.setTokenHash(sha256(refreshToken));
        stored.setExpiresAt(Instant.now().plusMillis(jwtService.getRefreshExpirationMs()));
        refreshTokenRepository.save(stored);

        return new AuthDtos.TokenResponse(
                user.getId(), user.getUsername(), user.getFullName(), user.getRole(),
                accessToken, refreshToken, jwtService.getAccessExpirationMs());
    }

    private String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Khong bam duoc token", ex);
        }
    }
}
