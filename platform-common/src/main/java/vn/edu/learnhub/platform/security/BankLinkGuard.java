package vn.edu.learnhub.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Chỉ bật trên service khai báo bank.link.protect.
 * Từ chối request thiếu chữ ký, quá hạn hoặc dùng lại nonce.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 30)
public class BankLinkGuard extends OncePerRequestFilter {

    private static final long MAX_SKEW_MS = 300_000;
    private final ConcurrentHashMap<String, Long> nonces = new ConcurrentHashMap<>();

    @Value("${bank.link.protect:}")
    private String protect;

    @Value("${bank.link.secret:}")
    private String secret;

    @Value("${bank.link.allow:commerce-service,payment-service}")
    private String allow;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (protect == null || protect.isBlank() || secret == null || secret.isBlank()) {
            chain.doFilter(request, response);
            return;
        }
        String uri = request.getRequestURI();
        boolean hit = Arrays.stream(protect.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .anyMatch(uri::startsWith);
        if (!hit) {
            chain.doFilter(request, response);
            return;
        }

        byte[] body = request.getInputStream().readAllBytes();
        String client = request.getHeader(BankLink.CLIENT);
        String timestamp = request.getHeader(BankLink.TIMESTAMP);
        String nonce = request.getHeader(BankLink.NONCE);
        String signature = request.getHeader(BankLink.SIGNATURE);
        Set<String> allowed = Arrays.stream(allow.split(",")).map(String::trim).collect(Collectors.toSet());

        if (client == null || !allowed.contains(client) || timestamp == null || nonce == null) {
            reject(response, "Thieu khoa giao tiep thanh toan");
            return;
        }
        long ts;
        try {
            ts = Long.parseLong(timestamp);
        } catch (NumberFormatException ex) {
            reject(response, "Thoi gian request khong hop le");
            return;
        }
        if (Math.abs(System.currentTimeMillis() - ts) > MAX_SKEW_MS) {
            reject(response, "Request thanh toan da het han");
            return;
        }
        long now = System.currentTimeMillis();
        nonces.entrySet().removeIf(e -> now - e.getValue() > MAX_SKEW_MS * 2);
        if (nonces.putIfAbsent(nonce, now) != null) {
            reject(response, "Nonce da duoc su dung");
            return;
        }
        if (!BankLink.matches(secret, client, timestamp, nonce, request.getMethod(), uri, body, signature)) {
            nonces.remove(nonce);
            reject(response, "Chu ky thanh toan khong hop le");
            return;
        }
        chain.doFilter(new CachedBodyRequest(request, body), response);
    }

    private void reject(HttpServletResponse response, String message) throws IOException {
        response.setStatus(401);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"success\":false,\"message\":\"" + message + "\"}");
    }

    private static final class CachedBodyRequest extends HttpServletRequestWrapper {
        private final byte[] body;

        private CachedBodyRequest(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public jakarta.servlet.ServletInputStream getInputStream() {
            ByteArrayInputStream input = new ByteArrayInputStream(body);
            return new jakarta.servlet.ServletInputStream() {
                @Override
                public int read() {
                    return input.read();
                }

                @Override
                public boolean isFinished() {
                    return input.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(jakarta.servlet.ReadListener readListener) {
                }
            };
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
