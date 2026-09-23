// path: platform-common/src/main/java/vn/edu/learnhub/platform/security/InternalKeyFilter.java
// purpose: API /internal/** chi danh cho service khac goi sang (Buoi 3).
// Gateway da chan tu ngoai, nhung theo Zero Trust ta chan them o chinh service:
// phai co header X-Internal-Key dung moi duoc vao.

package vn.edu.learnhub.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

@Component
public class InternalKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Key";

    @Value("${internal.api-key}")
    private String internalApiKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (!request.getRequestURI().contains("/internal/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String provided = request.getHeader(HEADER);
        if (provided == null || !provided.equals(internalApiKey)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("""
                    {"success":false,"code":401,"message":"API noi bo yeu cau X-Internal-Key",\
                    "data":null,"errors":[{"field":null,"message":"Thieu X-Internal-Key"}],\
                    "meta":null,"timestamp":"%s"}""".formatted(Instant.now().toString()));
            return;
        }

        filterChain.doFilter(request, response);
    }
}
