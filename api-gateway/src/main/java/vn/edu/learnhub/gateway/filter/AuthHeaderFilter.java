// path: api-gateway/src/main/java/vn/edu/learnhub/gateway/filter/AuthHeaderFilter.java
// purpose: chan som cac request thieu token (Buoi 4) va chan tuyet doi duong dan /internal/**.
// LUU Y: Gateway chi kiem tra CO token hay khong. Viec xac thuc chu ky va phan quyen chi tiet
// do TUNG SERVICE tu lam (nguyen tac Zero Trust - khong tin tuong ca request da qua Gateway).

package vn.edu.learnhub.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import vn.edu.learnhub.gateway.support.GatewayResponses;

import java.util.List;

@Component
public class AuthHeaderFilter implements GlobalFilter, Ordered {

    // Duong dan mo hoan toan, khong can dang nhap
    private static final List<String> OPEN_PREFIXES = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/public/"
    );

    // Duong dan chi mo cho GET (xem truoc khi mua - dung nhu Udemy)
    private static final List<String> PUBLIC_GET_PREFIXES = List.of(
            "/api/catalog/",
            "/api/social/reviews",
            "/api/social/questions",
            "/api/assist/help",
            "/api/org/plans"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        // API noi bo giua cac service KHONG duoc lo ra internet qua Gateway
        if (path.contains("/internal/")) {
            return GatewayResponses.error(exchange, HttpStatus.FORBIDDEN,
                    "API noi bo khong duoc goi tu ben ngoai");
        }

        if (HttpMethod.OPTIONS.equals(method)) {
            return chain.filter(exchange);
        }

        boolean open = OPEN_PREFIXES.stream().anyMatch(path::startsWith);
        boolean publicRead = HttpMethod.GET.equals(method)
                && PUBLIC_GET_PREFIXES.stream().anyMatch(path::startsWith);
        // Doanh nghiep dang ky dung thu: cho gui khong can tai khoan
        boolean demoRequest = HttpMethod.POST.equals(method) && path.startsWith("/api/org/demo-requests");
        // Ghi nhan luot xem khoa (sidebar "6 khoa hot") — khong can dang nhap
        boolean catalogView = HttpMethod.POST.equals(method)
                && path.matches("/api/catalog/courses/\\d+/view");

        if (open || publicRead || demoRequest || catalogView) {
            return chain.filter(exchange);
        }

        if (!request.getHeaders().containsKey("Authorization")) {
            return GatewayResponses.error(exchange, HttpStatus.UNAUTHORIZED,
                    "Ban can dang nhap de thuc hien chuc nang nay");
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -10;
    }
}
