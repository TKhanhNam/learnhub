package vn.edu.learnhub.identity.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.identity.service.SecurityAdminService;
import vn.edu.learnhub.identity.service.SecurityGuard;
import vn.edu.learnhub.platform.api.ApiResponse;

import java.util.List;
import java.util.Map;

@RestController
public class SecurityController {
    private final SecurityAdminService admin;
    private final SecurityGuard guard;

    public SecurityController(SecurityAdminService admin, SecurityGuard guard) {
        this.admin = admin;
        this.guard = guard;
    }

    @GetMapping("/users/admin/security/alerts")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<SecurityAdminService.AlertView>> alerts() {
        return ApiResponse.ok(admin.list());
    }

    @PostMapping("/users/admin/security/alerts/{id}/block")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> block(@PathVariable Long id) {
        return ApiResponse.ok(null, admin.block(id));
    }

    @PostMapping("/users/admin/security/alerts/{id}/dismiss")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> dismiss(@PathVariable Long id) {
        admin.dismiss(id);
        return ApiResponse.ok(null, "Da bo qua canh bao");
    }

    @GetMapping("/internal/security/blocked-ips")
    public List<String> blockedIps() {
        return admin.blockedAddresses();
    }

    @PostMapping("/internal/security/rate-limit")
    public void rateLimit(@RequestBody Map<String, Object> body) {
        Object ip = body.get("ip");
        Object auth = body.get("auth");
        guard.rateLimit(ip == null ? "" : String.valueOf(ip), Boolean.TRUE.equals(auth));
    }
}
