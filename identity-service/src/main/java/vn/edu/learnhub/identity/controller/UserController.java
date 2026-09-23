package vn.edu.learnhub.identity.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.identity.dto.UserDtos;
import vn.edu.learnhub.identity.service.UserService;
import vn.edu.learnhub.platform.api.ApiResponse;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ApiResponse<UserDtos.UserDTO> myProfile() {
        return ApiResponse.ok(userService.getById(CurrentUser.requireId()));
    }

    @PutMapping("/me")
    public ApiResponse<UserDtos.UserDTO> updateMyProfile(
            @Valid @RequestBody UserDtos.UpdateProfileRequest request) {
        return ApiResponse.ok(userService.updateProfile(CurrentUser.requireId(), request),
                "Cap nhat thong tin thanh cong");
    }

    @PostMapping("/me/change-password")
    public ApiResponse<Void> changePassword(
            @Valid @RequestBody UserDtos.ChangePasswordRequest request) {
        userService.changePassword(CurrentUser.requireId(), request);
        return ApiResponse.ok(null, "Doi mat khau thanh cong, vui long dang nhap lai");
    }

    @GetMapping("/{id}/public")
    public ApiResponse<UserDtos.PublicUserDTO> publicProfile(@PathVariable Long id) {
        return ApiResponse.ok(userService.getPublicById(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<UserDtos.UserDTO>> search(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<UserDtos.UserDTO> page = userService.search(keyword, pageable);
        return ApiResponse.page(page);
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserDtos.AdminStatsDTO> adminStats() {
        return ApiResponse.ok(userService.adminStats());
    }

    @GetMapping("/admin/mail-log")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<UserDtos.MailLogDTO>> mailLog(@PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.page(userService.mailLog(pageable));
    }

    @GetMapping("/admin/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportUsers() {
        byte[] bytes = userService.exportExcel();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=learnhub-tai-khoan.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserDtos.UserDTO> updateRole(@PathVariable Long id,
                                                    @Valid @RequestBody UserDtos.UpdateRoleRequest request) {
        return ApiResponse.ok(userService.updateRole(id, request.role()), "Da cap nhat vai tro");
    }

    @PatchMapping("/{id}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserDtos.UserDTO> setLocked(@PathVariable Long id,
                                                   @Valid @RequestBody UserDtos.LockRequest request) {
        boolean locked = Boolean.TRUE.equals(request.locked());
        return ApiResponse.ok(userService.setLocked(id, locked, request.reason()),
                locked ? "Da khoa tai khoan va gui email ly do" : "Da mo khoa tai khoan");
    }
}
