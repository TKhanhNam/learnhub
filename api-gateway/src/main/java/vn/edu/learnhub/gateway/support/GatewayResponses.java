// path: api-gateway/src/main/java/vn/edu/learnhub/gateway/support/GatewayResponses.java
// purpose: tra loi loi tu Gateway theo DUNG envelope JSON chung cua he thong
// { success, code, message, data, errors, meta, timestamp } - de Frontend chi can doc 1 cau truc

package vn.edu.learnhub.gateway.support;

import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

public final class GatewayResponses {

    private GatewayResponses() {
    }

    public static Mono<Void> error(ServerWebExchange exchange, HttpStatus status, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String traceId = exchange.getResponse().getHeaders().getFirst("X-Trace-Id");
        String body = """
                {"success":false,"code":%d,"message":"%s","data":null,\
                "errors":[{"field":null,"message":"%s"}],\
                "meta":{"traceId":"%s"},"timestamp":"%s"}"""
                .formatted(status.value(), escape(message), escape(message),
                        traceId == null ? "" : traceId, Instant.now().toString());

        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    private static String escape(String raw) {
        return raw == null ? "" : raw.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
