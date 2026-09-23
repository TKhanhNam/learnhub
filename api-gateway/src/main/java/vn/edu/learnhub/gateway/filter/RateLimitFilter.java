// path: api-gateway/src/main/java/vn/edu/learnhub/gateway/filter/RateLimitFilter.java
// purpose: Rate Limiting theo thuat toan Token Bucket (file cong nghe loi muc 2).
// Ban nay dung bo dem trong RAM de chay duoc ngay khong can Redis;
// khi len production doi sang Redis de nhieu instance Gateway dung chung bo dem.

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

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter implements GlobalFilter, Ordered {

    @Value("${ratelimit.enabled:true}")
    private boolean enabled;

    @Value("${ratelimit.capacity:120}")
    private int capacity;

    @Value("${ratelimit.refill-per-minute:120}")
    private int refillPerMinute;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!enabled) {
            return chain.filter(exchange);
        }

        String key = clientKey(exchange);
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(capacity));

        if (!bucket.tryConsume(capacity, refillPerMinute)) {
            return GatewayResponses.error(exchange, HttpStatus.TOO_MANY_REQUESTS,
                    "Ban gui qua nhieu yeu cau, vui long thu lai sau it phut");
        }
        return chain.filter(exchange);
    }

    // Uu tien dem theo API Key (doi tac), sau do den IP nguoi dung
    private String clientKey(ServerWebExchange exchange) {
        String apiKey = exchange.getRequest().getHeaders().getFirst("X-API-KEY");
        if (apiKey != null && !apiKey.isBlank()) {
            return "key:" + apiKey;
        }
        var remote = exchange.getRequest().getRemoteAddress();
        return "ip:" + (remote == null ? "unknown" : remote.getAddress().getHostAddress());
    }

    @Override
    public int getOrder() {
        return -50;
    }

    private static final class Bucket {
        private double tokens;
        private long lastRefillMs;

        private Bucket(int capacity) {
            this.tokens = capacity;
            this.lastRefillMs = System.currentTimeMillis();
        }

        private synchronized boolean tryConsume(int capacity, int refillPerMinute) {
            long now = System.currentTimeMillis();
            double refilled = (now - lastRefillMs) / 60_000.0 * refillPerMinute;
            if (refilled > 0) {
                tokens = Math.min(capacity, tokens + refilled);
                lastRefillMs = now;
            }
            if (tokens >= 1) {
                tokens -= 1;
                return true;
            }
            return false;
        }
    }
}
