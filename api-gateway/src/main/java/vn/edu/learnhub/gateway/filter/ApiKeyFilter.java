// path: api-gateway/src/main/java/vn/edu/learnhub/gateway/filter/ApiKeyFilter.java
// purpose: cong /api/public/** danh cho DOI TAC NGOAI - khong dung JWT ma dung API Key (Buoi 10).
// Thieu hoac sai X-API-KEY => 401, khong di tiep vao catalog-service.

package vn.edu.learnhub.gateway.filter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import vn.edu.learnhub.gateway.support.GatewayResponses;

@Component
public class ApiKeyFilter implements GlobalFilter, Ordered {

    @Value("${partner.api-key}")
    private String partnerApiKey;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        if (!path.startsWith("/api/public/")) {
            return chain.filter(exchange);
        }

        String providedKey = exchange.getRequest().getHeaders().getFirst("X-API-KEY");
        if (providedKey == null || !providedKey.equals(partnerApiKey)) {
            return GatewayResponses.error(exchange, HttpStatus.UNAUTHORIZED,
                    "Thieu hoac sai X-API-KEY danh cho doi tac");
        }
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -20;
    }
}
