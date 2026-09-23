package vn.edu.learnhub.identity.service;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.learnhub.identity.entity.AppUser;
import vn.edu.learnhub.identity.entity.EmailOutbox;
import vn.edu.learnhub.identity.repository.EmailOutboxRepository;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Properties;

@Service
public class AccountMailService {

    private static final Logger log = LoggerFactory.getLogger(AccountMailService.class);
    private static final DateTimeFormatter TIME =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final EmailOutboxRepository emailOutboxRepository;

    @Value("${learnhub.mail.from:LearnHub <no-reply@learnhub.vn>}")
    private String from;

    @Value("${learnhub.mail.outbox-dir:mail-outbox}")
    private String outboxDir;

    @Value("${learnhub.mail.host:${MAIL_HOST:}}")
    private String mailHost;

    @Value("${MAIL_PORT:587}")
    private int mailPort;

    @Value("${MAIL_USERNAME:}")
    private String mailUsername;

    @Value("${MAIL_PASSWORD:}")
    private String mailPassword;

    public AccountMailService(EmailOutboxRepository emailOutboxRepository) {
        this.emailOutboxRepository = emailOutboxRepository;
    }

    public EmailOutbox sendLockNotice(AppUser user, String reason, String adminName) {
        String subject = "Tài khoản LearnHub của bạn đã bị khóa";
        String when = TIME.format(Instant.now());
        String body = """
                <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#1f1f1f">
                  <h2 style="color:#0056d2">Tài khoản đã bị khóa</h2>
                  <p>Xin chào <strong>%s</strong>,</p>
                  <p>Tài khoản LearnHub (<strong>%s</strong>) đã bị quản trị viên khóa lúc %s.</p>
                  <p><strong>Lý do:</strong></p>
                  <p style="background:#f5f7fa;border-left:4px solid #0056d2;padding:12px 16px">%s</p>
                  <p>Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ hỗ trợ và nêu rõ tên đăng nhập.</p>
                  <p>Người thực hiện: %s</p>
                  <p style="color:#5b616b">LearnHub</p>
                </div>
                """.formatted(escape(user.getFullName()), escape(user.getUsername()), when,
                escape(reason), escape(adminName == null ? "Quản trị viên" : adminName));
        return dispatch(user.getEmail(), subject, body, user.getId());
    }

    public EmailOutbox sendUnlockNotice(AppUser user) {
        String subject = "Tài khoản LearnHub của bạn đã được mở khóa";
        String body = """
                <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#1f1f1f">
                  <h2 style="color:#0056d2">Tài khoản đã được mở khóa</h2>
                  <p>Xin chào <strong>%s</strong>,</p>
                  <p>Tài khoản <strong>%s</strong> đã có thể đăng nhập lại trên LearnHub.</p>
                </div>
                """.formatted(escape(user.getFullName()), escape(user.getUsername()));
        return dispatch(user.getEmail(), subject, body, user.getId());
    }

    private EmailOutbox dispatch(String to, String subject, String html, Long userId) {
        EmailOutbox outbox = new EmailOutbox();
        outbox.setRecipient(to);
        outbox.setSubject(subject);
        outbox.setBody(html);
        outbox.setRelatedUserId(userId);
        outbox.setCreatedAt(Instant.now());

        writeFile(to, subject, html);

        if (mailHost != null && !mailHost.isBlank()) {
            try {
                sendSmtp(to, subject, html);
                outbox.setStatus(EmailOutbox.SENT);
            } catch (Exception ex) {
                log.warn("Không gửi được SMTP tới {}: {}", to, ex.getMessage());
                outbox.setStatus(EmailOutbox.FAILED);
                outbox.setErrorMessage(trimError(ex.getMessage()));
            }
        } else {
            outbox.setStatus(EmailOutbox.FILE);
        }
        return emailOutboxRepository.save(outbox);
    }

    private void sendSmtp(String to, String subject, String html) throws Exception {
        Properties props = new Properties();
        props.put("mail.smtp.host", mailHost);
        props.put("mail.smtp.port", String.valueOf(mailPort));
        props.put("mail.smtp.auth", mailUsername == null || mailUsername.isBlank() ? "false" : "true");
        props.put("mail.smtp.starttls.enable", "true");

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(mailUsername, mailPassword);
            }
        });
        MimeMessage message = new MimeMessage(session);
        message.setFrom(new InternetAddress(extractAddress(from), "LearnHub", StandardCharsets.UTF_8.name()));
        message.setRecipient(Message.RecipientType.TO, new InternetAddress(to));
        message.setSubject(subject, StandardCharsets.UTF_8.name());
        message.setContent(html, "text/html; charset=UTF-8");
        Transport.send(message);
    }

    private void writeFile(String to, String subject, String html) {
        try {
            Path dir = Path.of(outboxDir);
            Files.createDirectories(dir);
            String safe = to.replaceAll("[^a-zA-Z0-9@.]+", "_");
            Path file = dir.resolve(System.currentTimeMillis() + "-" + safe + ".html");
            String content = "<!doctype html><meta charset=\"utf-8\"><title>"
                    + escape(subject) + "</title>" + html;
            Files.writeString(file, content, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            log.warn("Không ghi được file email: {}", ex.getMessage());
        }
    }

    private static String extractAddress(String fromHeader) {
        int start = fromHeader.indexOf('<');
        int end = fromHeader.indexOf('>');
        if (start >= 0 && end > start) {
            return fromHeader.substring(start + 1, end).trim();
        }
        return fromHeader.trim();
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String trimError(String message) {
        if (message == null) {
            return "SMTP error";
        }
        return message.length() > 480 ? message.substring(0, 480) : message;
    }
}
