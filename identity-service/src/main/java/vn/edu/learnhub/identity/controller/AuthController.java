// path: identity-service/src/main/java/vn/edu/learnhub/identity/controller/AuthController.java
// purpose: cong xac thuc. Refresh token duoc dat trong cookie HttpOnly (chong XSS doc token),
// dong thoi tra ca trong body de SPA chay cross-origin trong moi truong hoc tap van dung duoc.

package vn.edu.learnhub.identity.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.identity.dto.AuthDtos;
import vn.edu.learnhub.identity.dto.UserDtos;
import vn.edu.learnhub.identity.service.AuthService;
import vn.edu.learnhub.identity.service.UserService;
import vn.edu.learnhub.platform.api.ApiResponse;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.time.Duration;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @Value("${auth.refresh-cookie-name:learnhub_refresh}")
    private String refreshCookieName;

    @Value("${auth.refresh-cookie-secure:false}")
    private boolean refreshCookieSecure;

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthDtos.TokenResponse>> register(
            @Valid @RequestBody AuthDtos.RegisterRequest request) {

        AuthDtos.TokenResponse token = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(token.refreshToken()).toString())
                .body(ApiResponse.created(token, "Dang ky thanh cong"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthDtos.TokenResponse>> login(
            @Valid @RequestBody AuthDtos.LoginRequest request) {

        AuthDtos.TokenResponse token = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(token.refreshToken()).toString())
                .body(ApiResponse.ok(token, "Dang nhap thanh cong"));
    }

    /** Frontend goi ngam khi access token het han - nguoi dung khong bi dang xuat dot ngot. */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthDtos.TokenResponse>> refresh(
            @RequestBody(required = false) AuthDtos.RefreshRequest body,
            HttpServletRequest request) {

        String refreshToken = readRefreshToken(body, request);
        AuthDtos.TokenResponse token = authService.refresh(refreshToken);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(token.refreshToken()).toString())
                .body(ApiResponse.ok(token, "Cap lai token thanh cong"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody(required = false) AuthDtos.RefreshRequest body,
            HttpServletRequest request) {

        authService.logout(readRefreshToken(body, request));

        ResponseCookie cleared = ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true).secure(refreshCookieSecure).path("/").maxAge(0).sameSite("Lax").build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cleared.toString())
                .body(ApiResponse.ok(null, "Da dang xuat"));
    }

    @GetMapping("/me")
    public ApiResponse<UserDtos.UserDTO> me() {
        return ApiResponse.ok(userService.getById(CurrentUser.requireId()));
    }

    private String readRefreshToken(AuthDtos.RefreshRequest body, HttpServletRequest request) {
        if (body != null && body.refreshToken() != null && !body.refreshToken().isBlank()) {
            return body.refreshToken();
        }
        if (request.getCookies() != null) {
            for (var cookie : request.getCookies()) {
                if (refreshCookieName.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from(refreshCookieName, refreshToken)
                .httpOnly(true)               // JavaScript khong doc duoc -> chong XSS an token
                .secure(refreshCookieSecure)  // production: bat buoc true (HTTPS)
                .path("/")
                .sameSite("Lax")
                .maxAge(Duration.ofDays(7))
                .build();
    }
}
