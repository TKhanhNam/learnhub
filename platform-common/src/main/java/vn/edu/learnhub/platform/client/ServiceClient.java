// path: platform-common/src/main/java/vn/edu/learnhub/platform/client/ServiceClient.java
// purpose: goi lien-service (Buoi 3) mot cach an toan:
// - gui kem X-Internal-Key va X-Trace-Id
// - doi loi HTTP cua service kia thanh BusinessException co message ro rang
// - co Circuit Breaker: 1 service chet thi ngat tam thoi, tranh sup do day chuyen (Cascading Failure)

package vn.edu.learnhub.platform.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.InternalKeyFilter;
import vn.edu.learnhub.platform.trace.TraceContext;
import vn.edu.learnhub.platform.trace.TraceIdMdcFilter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ServiceClient {

    private static final Logger log = LoggerFactory.getLogger(ServiceClient.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Map<String, CircuitBreaker> breakers = new ConcurrentHashMap<>();

    @Value("${internal.api-key}")
    private String internalApiKey;

    public ServiceClient(RestClient.Builder builder, ObjectMapper objectMapper) {
        this.restClient = builder.build();
        this.objectMapper = objectMapper;
    }

    public <T> T get(String target, String url, Class<T> type) {
        return exchange(target, HttpMethod.GET, url, null, type);
    }

    public <T> T patch(String target, String url, Object body, Class<T> type) {
        return exchange(target, HttpMethod.PATCH, url, body, type);
    }

    public <T> T post(String target, String url, Object body, Class<T> type) {
        return exchange(target, HttpMethod.POST, url, body, type);
    }

    private <T> T exchange(String target, HttpMethod method, String url, Object body, Class<T> type) {
        CircuitBreaker breaker = breakers.computeIfAbsent(target, key -> new CircuitBreaker());

        if (breaker.isOpen()) {
            throw BusinessException.unavailable(
                    "Dich vu " + target + " dang tam ngung phan hoi, vui long thu lai sau it phut");
        }

        try {
            RestClient.RequestBodySpec spec = restClient.method(method)
                    .uri(url)
                    .header(InternalKeyFilter.HEADER, internalApiKey);

            String traceId = TraceContext.get();
            if (traceId != null) {
                spec = spec.header(TraceIdMdcFilter.TRACE_HEADER, traceId);
            }

            if (type == Void.class) {
                (body == null ? spec : spec.body(body)).retrieve().toBodilessEntity();
                breaker.recordSuccess();
                return null;
            }

            T result = (body == null ? spec : spec.body(body))
                    .retrieve()
                    .body(type);

            breaker.recordSuccess();
            return result;

        } catch (RestClientResponseException ex) {
            // Service kia tra loi loi nghiep vu -> giu nguyen y nghia cho nguoi dung cuoi
            HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
            String message = extractMessage(ex.getResponseBodyAsString(), target);

            if (status != null && status.is5xxServerError()) {
                breaker.recordFailure();
                throw BusinessException.unavailable(
                        "Dich vu " + target + " dang loi, vui long thu lai sau");
            }

            breaker.recordSuccess(); // loi 4xx la loi nghiep vu, service kia van song
            throw new BusinessException(status == null ? HttpStatus.BAD_REQUEST : status, message);

        } catch (ResourceAccessException ex) {
            breaker.recordFailure();
            log.warn("Khong goi duoc {} tai {}: {}", target, url, ex.getMessage());
            String detail = ex.getMessage() == null ? "" : ex.getMessage();
            if (detail.toLowerCase().contains("patch") || detail.toLowerCase().contains("invalid http method")) {
                throw BusinessException.unavailable(
                        "Loi goi noi bo " + target + " (HTTP PATCH). Vui long thu lai sau khi cap nhat client.");
            }
            throw BusinessException.unavailable(
                    "Khong ket noi duoc dich vu " + target + ", vui long thu lai sau");
        }
    }

    /** Doc truong "message" trong envelope cua service kia. */
    private String extractMessage(String responseBody, String target) {
        if (responseBody == null || responseBody.isBlank()) {
            return "Dich vu " + target + " tu choi yeu cau";
        }
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            JsonNode message = node.get("message");
            if (message != null && !message.asText().isBlank()) {
                return message.asText();
            }
        } catch (Exception ignored) {
            // body khong phai JSON -> dung message mac dinh
        }
        return "Dich vu " + target + " tu choi yeu cau";
    }

    /**
     * Circuit Breaker toi gian: 3 lan loi ha tang lien tiep thi "mo" 15 giay.
     * Du de minh hoa pattern; du an that co the thay bang Resilience4j.
     */
    private static final class CircuitBreaker {

        private static final int FAILURE_THRESHOLD = 3;
        private static final long OPEN_DURATION_MS = 15_000L;

        private int consecutiveFailures;
        private long openedAtMs;

        private synchronized boolean isOpen() {
            if (consecutiveFailures < FAILURE_THRESHOLD) {
                return false;
            }
            if (System.currentTimeMillis() - openedAtMs > OPEN_DURATION_MS) {
                consecutiveFailures = 0; // thu lai (half-open)
                return false;
            }
            return true;
        }

        private synchronized void recordSuccess() {
            consecutiveFailures = 0;
        }

        private synchronized void recordFailure() {
            consecutiveFailures++;
            openedAtMs = System.currentTimeMillis();
        }
    }
}
