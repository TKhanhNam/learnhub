package vn.edu.learnhub.identity.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.identity.entity.AppUser;
import vn.edu.learnhub.identity.entity.SecurityAlert;
import vn.edu.learnhub.identity.repository.AppUserRepository;
import vn.edu.learnhub.identity.repository.SecurityAlertRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SecurityGuard {
    static final String OPEN = "OPEN";
    static final String LOGIN_FLOOD = "LOGIN_FLOOD";
    static final String HUMAN_CHECK = "HUMAN_CHECK";
    static final String RATE_LIMIT = "RATE_LIMIT";

    private final SecurityAlertRepository alerts;
    private final AppUserRepository users;
    private final AccountMailService mail;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public SecurityGuard(SecurityAlertRepository alerts, AppUserRepository users, AccountMailService mail) {
        this.alerts = alerts;
        this.users = users;
        this.mail = mail;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void humanRejected(String username, String ip) {
        if (hit(key("human", ip), 5, 10)) {
            open(HUMAN_CHECK, ip, username,
                    "Nhieu lan dang nhap khong xac nhan 'Toi la nguoi' tu may " + ip
                            + (blank(username) ? "." : ", tai khoan " + username + "."));
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void loginFailed(String username, String ip) {
        boolean userFlood = !blank(username) && hit(key("user", username), 6, 10);
        boolean ipFlood = hit(key("ip", ip), 10, 10);
        if (userFlood || ipFlood) {
            open(LOGIN_FLOOD, ip, username,
                    "Qua nhieu lan dang nhap sai tu may " + ip
                            + (blank(username) ? "." : " vao tai khoan " + username + "."));
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void rateLimit(String ip, boolean auth) {
        if (blank(ip)) {
            return;
        }
        String message = auth
                ? "May " + ip + " dang gui dang nhap/dang ky qua muc cho phep."
                : "May " + ip + " gui request qua muc cho phep trong mot phut.";
        open(RATE_LIMIT, ip, null, message);
    }

    private void open(String kind, String ip, String username, String message) {
        Instant since = Instant.now().minus(10, ChronoUnit.MINUTES);
        if (alerts.existsByKindAndSourceIpAndStatusAndCreatedAtAfter(kind, ip, OPEN, since)) {
            return;
        }
        SecurityAlert alert = new SecurityAlert();
        alert.setKind(kind);
        alert.setSourceIp(trim(ip, 64));
        alert.setUsername(blank(username) ? null : trim(username.trim(), 60));
        alert.setMessage(trim(message, 500));
        alert.setStatus(OPEN);
        alert.setCreatedAt(Instant.now());
        alerts.save(alert);
        for (AppUser admin : users.findByRole(Roles.ADMIN)) {
            mail.sendAttackNotice(admin, alert.getMessage());
        }
    }

    private boolean hit(String key, int limit, int minutes) {
        if (key == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        Window window = windows.computeIfAbsent(key, k -> new Window());
        synchronized (window) {
            if (now - window.start > minutes * 60_000L) {
                window.start = now;
                window.count = 0;
            }
            window.count++;
            return window.count == limit;
        }
    }

    private static String key(String kind, String value) {
        if (blank(value)) {
            return null;
        }
        return kind + ":" + value.trim();
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String trim(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static final class Window {
        private int count;
        private long start = System.currentTimeMillis();
    }
}
