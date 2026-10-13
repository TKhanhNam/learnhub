package vn.edu.learnhub.identity.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.identity.entity.AppUser;
import vn.edu.learnhub.identity.entity.PasswordReset;
import vn.edu.learnhub.identity.repository.AppUserRepository;
import vn.edu.learnhub.identity.repository.PasswordResetRepository;
import vn.edu.learnhub.platform.error.BusinessException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class PasswordResetService {
    private final AppUserRepository users;
    private final PasswordResetRepository resets;
    private final PasswordEncoder passwordEncoder;
    private final AccountMailService mail;
    private final AuthService authService;
    private final String webBase;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(AppUserRepository users,
                                PasswordResetRepository resets,
                                PasswordEncoder passwordEncoder,
                                AccountMailService mail,
                                AuthService authService,
                                @Value("${learnhub.web-base:http://localhost:5173}") String webBase) {
        this.users = users;
        this.resets = resets;
        this.passwordEncoder = passwordEncoder;
        this.mail = mail;
        this.authService = authService;
        this.webBase = webBase;
    }

    @Transactional
    public String requestReset(String email) {
        if (email == null || email.isBlank()) {
            throw BusinessException.badRequest("Thieu email");
        }
        AppUser user = users.findByEmailIgnoreCase(email.trim()).orElse(null);
        if (user == null || user.isLocked()) {
            return null;
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        PasswordReset row = new PasswordReset();
        row.setUserId(user.getId());
        row.setTokenHash(sha256(token));
        row.setExpiresAt(Instant.now().plus(30, ChronoUnit.MINUTES));
        resets.save(row);
        String url = webBase + "/reset-password?token=" + token;
        mail.sendPasswordReset(user, url);
        return mail.smtpConfigured() ? null : url;
    }

    @Transactional
    public void reset(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw BusinessException.badRequest("Thieu ma dat lai mat khau");
        }
        PasswordReset row = resets.findByTokenHash(sha256(token.trim()))
                .orElseThrow(() -> BusinessException.badRequest("Lien ket dat lai mat khau khong hop le"));
        if (row.getUsedAt() != null || row.getExpiresAt().isBefore(Instant.now())) {
            throw BusinessException.badRequest("Lien ket dat lai mat khau da het han");
        }
        AppUser user = users.findById(row.getUserId())
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay tai khoan"));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        row.setUsedAt(Instant.now());
        users.save(user);
        resets.save(row);
        authService.revokeAllTokens(user.getId());
    }

    private static String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Khong bam duoc ma dat lai mat khau", ex);
        }
    }
}
