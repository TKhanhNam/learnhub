package vn.edu.learnhub.identity.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.identity.entity.AppUser;
import vn.edu.learnhub.identity.entity.BlockedIp;
import vn.edu.learnhub.identity.entity.SecurityAlert;
import vn.edu.learnhub.identity.repository.AppUserRepository;
import vn.edu.learnhub.identity.repository.BlockedIpRepository;
import vn.edu.learnhub.identity.repository.SecurityAlertRepository;
import vn.edu.learnhub.platform.error.BusinessException;

import java.time.Instant;
import java.util.List;

@Service
public class SecurityAdminService {
    private final SecurityAlertRepository alerts;
    private final BlockedIpRepository blockedIps;
    private final AppUserRepository users;
    private final UserService userService;

    public SecurityAdminService(SecurityAlertRepository alerts,
                                BlockedIpRepository blockedIps,
                                AppUserRepository users,
                                UserService userService) {
        this.alerts = alerts;
        this.blockedIps = blockedIps;
        this.users = users;
        this.userService = userService;
    }

    public List<AlertView> list() {
        return alerts.findTop50ByOrderByCreatedAtDesc().stream().map(this::toView).toList();
    }

    public List<String> blockedAddresses() {
        return blockedIps.findAll().stream().map(BlockedIp::getIp).toList();
    }

    @Transactional
    public String block(Long alertId) {
        SecurityAlert alert = alerts.findById(alertId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay canh bao"));
        if (!SecurityGuard.OPEN.equals(alert.getStatus())) {
            throw BusinessException.badRequest("Canh bao nay da duoc xu ly");
        }
        StringBuilder note = new StringBuilder();
        AppUser target = alert.getUsername() == null ? null : users.findByUsername(alert.getUsername()).orElse(null);
        if (target != null && Roles.ADMIN.equals(target.getRole())) {
            note.append("Khong khoa tai khoan quan tri. ");
        } else if (target != null) {
            String reason = "Chan tu muc Bao mat vi dau hieu tan cong"
                    + (alert.getSourceIp() == null ? "." : " tu may " + alert.getSourceIp() + ".");
            userService.setLocked(target.getId(), true, reason);
            note.append("Da khoa tai khoan ").append(target.getUsername()).append(". ");
        } else if (alert.getUsername() != null) {
            note.append("Khong tim thay tai khoan ").append(alert.getUsername()).append(". ");
        }
        if (alert.getSourceIp() != null && !alert.getSourceIp().isBlank() && !loopback(alert.getSourceIp())) {
            BlockedIp row = blockedIps.findById(alert.getSourceIp()).orElseGet(BlockedIp::new);
            row.setIp(alert.getSourceIp());
            row.setReason("Chan tu canh bao #" + alert.getId());
            row.setCreatedAt(Instant.now());
            blockedIps.save(row);
            note.append("Da chan may ").append(alert.getSourceIp()).append(".");
        } else if (loopback(alert.getSourceIp())) {
            note.append("May local khong bi chan, de ban van vao duoc trang.");
        }
        alert.setStatus("BLOCKED");
        alerts.save(alert);
        return note.toString().trim();
    }

    private static boolean loopback(String ip) {
        return ip == null || ip.isBlank()
                || "127.0.0.1".equals(ip)
                || "::1".equals(ip)
                || "0:0:0:0:0:0:0:1".equals(ip);
    }

    @Transactional
    public void dismiss(Long alertId) {
        SecurityAlert alert = alerts.findById(alertId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay canh bao"));
        if (SecurityGuard.OPEN.equals(alert.getStatus())) {
            alert.setStatus("DISMISSED");
            alerts.save(alert);
        }
    }

    private AlertView toView(SecurityAlert alert) {
        AppUser target = alert.getUsername() == null ? null : users.findByUsername(alert.getUsername()).orElse(null);
        boolean canLock = target != null && !Roles.ADMIN.equals(target.getRole()) && SecurityGuard.OPEN.equals(alert.getStatus());
        return new AlertView(alert.getId(), alert.getKind(), alert.getSourceIp(), alert.getUsername(),
                alert.getMessage(), alert.getStatus(), alert.getCreatedAt(), canLock);
    }

    public record AlertView(Long id, String kind, String sourceIp, String username, String message,
                            String status, Instant createdAt, boolean canLockAccount) {}
}
