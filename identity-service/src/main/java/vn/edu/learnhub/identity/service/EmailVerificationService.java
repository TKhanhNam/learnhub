package vn.edu.learnhub.identity.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.identity.entity.AppUser;
import vn.edu.learnhub.identity.entity.EmailVerification;
import vn.edu.learnhub.identity.repository.AppUserRepository;
import vn.edu.learnhub.identity.repository.EmailVerificationRepository;
import vn.edu.learnhub.platform.error.BusinessException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class EmailVerificationService {
    private final AppUserRepository userRepository;
    private final EmailVerificationRepository verificationRepository;
    private final AccountMailService mailService;
    private final String webBase;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(AppUserRepository userRepository,
                                    EmailVerificationRepository verificationRepository,
                                    AccountMailService mailService,
                                    @Value("${learnhub.web-base:http://localhost:5173}") String webBase) {
        this.userRepository = userRepository;
        this.verificationRepository = verificationRepository;
        this.mailService = mailService;
        this.webBase = webBase;
    }

    @Transactional
    public String issue(AppUser user) {
        if (user.getEmailVerifiedAt() != null) {
            return null;
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        EmailVerification row = new EmailVerification();
        row.setUserId(user.getId());
        row.setTokenHash(sha256(token));
        row.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        verificationRepository.save(row);
        String url = webBase + "/verify-email?token=" + token;
        mailService.sendVerification(user, url);
        return mailService.smtpConfigured() ? null : url;
    }

    @Transactional
    public void confirm(String token) {
        if (token == null || token.isBlank()) {
            throw BusinessException.badRequest("Thieu ma xac thuc email");
        }
        EmailVerification row = verificationRepository.findByTokenHash(sha256(token.trim()))
                .orElseThrow(() -> BusinessException.badRequest("Lien ket xac thuc khong hop le"));
        AppUser user = userRepository.findById(row.getUserId())
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay tai khoan"));
        if (user.getEmailVerifiedAt() != null) {
            return;
        }
        if (row.getUsedAt() != null || row.getExpiresAt().isBefore(Instant.now())) {
            throw BusinessException.badRequest("Lien ket xac thuc da het han");
        }
        row.setUsedAt(Instant.now());
        user.setEmailVerifiedAt(Instant.now());
        verificationRepository.save(row);
        userRepository.save(user);
    }

    @Transactional
    public String resend(Long userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay tai khoan"));
        if (user.getEmailVerifiedAt() != null) {
            throw BusinessException.badRequest("Email da duoc xac thuc");
        }
        return issue(user);
    }

    private static String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Khong bam duoc ma xac thuc", ex);
        }
    }
}
