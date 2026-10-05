package vn.edu.learnhub.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import vn.edu.learnhub.gateway.support.GatewayResponses;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Chống DoS theo từng máy: mỗi IP có một ngân sách request.
 * Ngân sách đủ cho người dùng mở trang và bấm liên tục, nhưng một vòng lặp tự động sẽ bị cắt.
 * Đăng nhập bị siết chặt hơn. IP đã bị admin chặn thì từ chối luôn.
 */
@Component
public class RateLimitFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final String CLIENT_IP = "X-LearnHub-Client-Ip";

    @Value("${ratelimit.enabled:true}")
    private boolean enabled;

    @Value("${ratelimit.capacity:100}")
    private int capacity;

    @Value("${ratelimit.refill-per-minute:200}")
    private int refillPerMinute;

    @Value("${ratelimit.auth-capacity:15}")
    private int authCapacity;

    @Value("${ratelimit.auth-refill-per-minute:15}")
    private int authRefillPerMinute;

    @Value("${services.identity-url:http://localhost:8081}")
    private String identityUrl;

    @Value("${internal.api-key:learnhub-internal-key-2026}")
    private String internalKey;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final Map<String, Strikes> strikes = new ConcurrentHashMap<>();
    private final Map<String, Long> alertedAt = new ConcurrentHashMap<>();
    private volatile Set<String> blockedIps = Set.of();
    private final WebClient webClient = WebClient.builder().build();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String ip = clientIp(exchange);
        ServerWebExchange tagged = exchange.mutate()
                .request(builder -> builder.headers(headers -> headers.set(CLIENT_IP, ip)))
                .build();
        if (!enabled) {
            return chain.filter(tagged);
        }
        if (blockedIps.contains(ip)) {
            return GatewayResponses.error(tagged, HttpStatus.FORBIDDEN,
                    "May nay da bi chan vi co dau hieu tan cong");
        }

        String path = exchange.getRequest().getURI().getPath();
        boolean auth = path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register");
        if (auth && !allow(authKey(ip), authCapacity, authRefillPerMinute)) {
            raise(ip, true);
            return GatewayResponses.error(tagged, HttpStatus.TOO_MANY_REQUESTS,
                    "May nay dang nhap qua nhieu lan, vui long thu lai sau it phut");
        }
        if (!allow(generalKey(ip), capacity, refillPerMinute)) {
            raise(ip, false);
            return GatewayResponses.error(tagged, HttpStatus.TOO_MANY_REQUESTS,
                    "May nay gui qua nhieu yeu cau, vui long thu lai sau it phut");
        }
        return chain.filter(tagged);
    }

    @Scheduled(fixedDelay = 15000)
    public void refreshBlockedIps() {
        webClient.get()
                .uri(identityUrl + "/internal/security/blocked-ips")
                .header("X-Internal-Key", internalKey)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<String>>() {})
                .subscribe(this::replaceBlocked, ex -> log.debug("Chua lay duoc danh sach IP bi chan: {}", ex.getMessage()));
    }

    private void replaceBlocked(List<String> ips) {
        blockedIps = ips == null ? Set.of() : Set.copyOf(ips);
    }

    private boolean allow(String key, int bucketCapacity, int refill) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(bucketCapacity));
        return bucket.tryConsume(bucketCapacity, refill);
    }

    private void raise(String ip, boolean auth) {
        long now = System.currentTimeMillis();
        if (!auth) {
            Strikes row = strikes.computeIfAbsent(ip, k -> new Strikes());
            synchronized (row) {
                if (now - row.windowStart > 60_000) {
                    row.windowStart = now;
                    row.count = 0;
                }
                row.count++;
                if (row.count < 12) {
                    return;
                }
            }
        }
        long last = alertedAt.getOrDefault(ip, 0L);
        if (now - last < 10 * 60_000) {
            return;
        }
        alertedAt.put(ip, now);
        webClient.post()
                .uri(identityUrl + "/internal/security/rate-limit")
                .header("X-Internal-Key", internalKey)
                .bodyValue(Map.of("ip", ip, "auth", auth))
                .retrieve()
                .toBodilessEntity()
                .subscribe(ok -> { }, ex -> log.warn("Khong gui duoc canh bao tan cong: {}", ex.getMessage()));
    }

    private String clientIp(ServerWebExchange exchange) {
        String apiKey = exchange.getRequest().getHeaders().getFirst("X-API-KEY");
        if (apiKey != null && !apiKey.isBlank()) {
            return "key:" + apiKey;
        }
        var remote = exchange.getRequest().getRemoteAddress();
        if (remote == null || remote.getAddress() == null) {
            return "unknown";
        }
        return remote.getAddress().getHostAddress();
    }

    private static String generalKey(String ip) {
        return "ip:" + ip;
    }

    private static String authKey(String ip) {
        return "auth:" + ip;
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

    private static final class Strikes {
        private int count;
        private long windowStart = System.currentTimeMillis();
    }
}
