// path: platform-common/src/main/java/vn/edu/learnhub/platform/security/JwtAuthFilter.java
// purpose: moi service TU xac thuc JWT (khong tin tuong rang request da qua Gateway la an toan).
// Token rac / het han => 401 ngay tai day (dung yeu cau Buoi 10), khong phai 403 mo ho.

package vn.edu.learnhub.platform.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7).trim();
        try {
            Claims claims = jwtService.parse(token);

            // Refresh token KHONG duoc dung nhu access token
            String type = claims.get(JwtService.CLAIM_TYPE, String.class);
            if (type != null && JwtService.TYPE_REFRESH.equals(type)) {
                throw new IllegalArgumentException("Refresh token khong dung de goi API");
            }

            Long userId = claims.get(JwtService.CLAIM_USER_ID, Number.class) == null
                    ? null
                    : claims.get(JwtService.CLAIM_USER_ID, Number.class).longValue();
            String role = claims.get(JwtService.CLAIM_ROLE, String.class);
            AuthUser authUser = new AuthUser(userId, claims.getSubject(), role);

            var authentication = new UsernamePasswordAuthenticationToken(
                    authUser, null,
                    role == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + role)));

            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            writeUnauthorized(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("""
                {"success":false,"code":401,"message":"Token khong hop le hoac da het han",\
                "data":null,"errors":[{"field":null,"message":"Token khong hop le hoac da het han"}],\
                "meta":null,"timestamp":"%s"}""".formatted(Instant.now().toString()));
    }
}
