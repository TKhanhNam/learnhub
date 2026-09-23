// path: api-gateway/src/main/java/vn/edu/learnhub/gateway/filter/TraceIdFilter.java
// purpose: gan X-Trace-Id ngay tai cong bien (Distributed Tracing - file cong nghe loi).
// Moi service phia sau chi viec log lai header nay => 1 request di qua nhieu service van truy vet duoc.

package vn.edu.learnhub.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class TraceIdFilter implements GlobalFilter, Ordered {

    public static final String TRACE_HEADER = "X-Trace-Id";

    private static final Logger log = LoggerFactory.getLogger(TraceIdFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String incoming = exchange.getRequest().getHeaders().getFirst(TRACE_HEADER);
        String traceId = (incoming == null || incoming.isBlank())
                ? UUID.randomUUID().toString().replace("-", "").substring(0, 16)
                : incoming;

        ServerHttpRequest request = exchange.getRequest().mutate()
                .header(TRACE_HEADER, traceId)
                .build();

        exchange.getResponse().getHeaders().set(TRACE_HEADER, traceId);

        log.info("[{}] {} {}", traceId, request.getMethod(), request.getURI().getPath());

        return chain.filter(exchange.mutate().request(request).build());
    }

    @Override
    public int getOrder() {
        return -100; // chay dau tien, truoc moi filter khac
    }
}
