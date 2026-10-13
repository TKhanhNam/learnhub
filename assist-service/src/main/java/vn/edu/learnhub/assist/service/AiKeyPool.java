package vn.edu.learnhub.assist.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import vn.edu.learnhub.assist.dto.AssistDtos;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Bảng key AI của trợ lý (assist.ai.keys, theo thứ tự ưu tiên).
 * Luôn dùng key đầu tiên còn sẵn sàng; key bị giới hạn, sai, hết tiền hoặc nhà cung cấp quá tải
 * thì tạm nghỉ và chuyển sang key kế tiếp. Hết thời gian nghỉ thì key được dùng lại.
 */
@Service
public class AiKeyPool {

    private static final Logger log = LoggerFactory.getLogger(AiKeyPool.class);
    private static final Duration RATE_LIMITED = Duration.ofSeconds(60);
    private static final Duration UNAVAILABLE = Duration.ofSeconds(60);
    private static final Duration BAD_REQUEST = Duration.ofMinutes(10);
    private static final Duration REJECTED = Duration.ofHours(1);
    private static final int MAX_TOKENS = 1536;

    enum Provider {
        GROQ("Groq", "https://api.groq.com/openai/v1/chat/completions"),
        GEMINI("Gemini", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"),
        OPENROUTER("OpenRouter", "https://openrouter.ai/api/v1/chat/completions");

        final String label;
        final String url;

        Provider(String label, String url) {
            this.label = label;
            this.url = url;
        }

        static Provider of(String key) {
            if (key.startsWith("gsk_")) {
                return GROQ;
            }
            if (key.startsWith("AIza")) {
                return GEMINI;
            }
            if (key.startsWith("sk-or-")) {
                return OPENROUTER;
            }
            return null;
        }
    }

    private static final class Slot {
        final int number;
        final Provider provider;
        final String model;
        final String key;
        final AtomicLong answered = new AtomicLong();
        volatile Instant restingUntil = Instant.EPOCH;
        volatile String lastError;

        Slot(int number, Provider provider, String model, String key) {
            this.number = number;
            this.provider = provider;
            this.model = model;
            this.key = key;
        }
    }

    private final List<Slot> slots;
    private final RestClient http;

    @Autowired
    public AiKeyPool(@Value("${assist.ai.keys:}") String keys,
                     @Value("${assist.ai.model.groq}") String groqModel,
                     @Value("${assist.ai.model.gemini}") String geminiModel,
                     @Value("${assist.ai.model.openrouter}") String openRouterModel,
                     @Value("${assist.ai.timeout-seconds:15}") int timeoutSeconds) {
        this(keys, Map.of(Provider.GROQ, groqModel, Provider.GEMINI, geminiModel, Provider.OPENROUTER, openRouterModel),
                client(timeoutSeconds));
    }

    AiKeyPool(String keys, Map<Provider, String> models, RestClient http) {
        this.http = http;
        this.slots = new ArrayList<>();
        for (String key : Arrays.stream(keys.split(",")).map(String::trim).filter(k -> !k.isEmpty()).toList()) {
            Provider provider = Provider.of(key);
            if (provider == null) {
                log.warn("Bo qua key AI khong ro nha cung cap: {}", mask(key));
                continue;
            }
            slots.add(new Slot(slots.size() + 1, provider, models.get(provider), key));
        }
        log.info("Tro ly AI co {} key: {}", slots.size(), slots.stream().map(s -> s.provider.label).toList());
    }

    private static RestClient client(int timeoutSeconds) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        return RestClient.builder().requestFactory(factory).build();
    }

    /** Trả lời bằng key đầu tiên còn dùng được; rỗng nếu mọi key đều đang nghỉ hoặc lỗi. */
    public Optional<String> ask(String system, String question) {
        for (Slot slot : slots) {
            if (Instant.now().isBefore(slot.restingUntil)) {
                continue;
            }
            try {
                String answer = call(slot, system, question);
                if (!answer.isBlank()) {
                    slot.answered.incrementAndGet();
                    slot.lastError = null;
                    return Optional.of(answer);
                }
                slot.lastError = "Tra loi rong";
            } catch (RestClientResponseException ex) {
                int status = ex.getStatusCode().value();
                rest(slot, cooldown(status, ex.getResponseHeaders() == null
                        ? null : ex.getResponseHeaders().getFirst("Retry-After")), "HTTP " + status);
            } catch (Exception ex) {
                rest(slot, UNAVAILABLE, "Khong ket noi duoc (" + ex.getClass().getSimpleName() + ")");
            }
        }
        return Optional.empty();
    }

    public List<AssistDtos.AiKeyDTO> status() {
        Instant now = Instant.now();
        return slots.stream().map(s -> {
            boolean resting = now.isBefore(s.restingUntil);
            return new AssistDtos.AiKeyDTO(s.number, s.provider.label, s.model, mask(s.key),
                    resting ? "TAM_NGHI" : "SAN_SANG", resting ? s.restingUntil : null,
                    s.lastError, s.answered.get());
        }).toList();
    }

    private String call(Slot slot, String system, String question) {
        Map<String, Object> body = Map.of(
                "model", slot.model,
                "messages", List.of(
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", question)),
                "max_tokens", MAX_TOKENS,
                "temperature", 0.4);
        JsonNode reply = http.post()
                .uri(slot.provider.url)
                .header("Authorization", "Bearer " + slot.key)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        if (reply == null) {
            return "";
        }
        return reply.path("choices").path(0).path("message").path("content").asText("")
                .replace("**", "")
                .trim();
    }

    private static Duration cooldown(int status, String retryAfter) {
        if (status == 429) {
            try {
                long seconds = Long.parseLong(retryAfter == null ? "" : retryAfter.trim());
                return Duration.ofSeconds(Math.min(Math.max(seconds, 1), REJECTED.toSeconds()));
            } catch (NumberFormatException ex) {
                return RATE_LIMITED;
            }
        }
        if (status == 401 || status == 402 || status == 403) {
            return REJECTED;
        }
        if (status >= 500) {
            return UNAVAILABLE;
        }
        return BAD_REQUEST;
    }

    private void rest(Slot slot, Duration duration, String reason) {
        slot.restingUntil = Instant.now().plus(duration);
        slot.lastError = reason;
        log.warn("Key AI #{} ({}) {}, nghi {} giay, chuyen sang key ke tiep",
                slot.number, slot.provider.label, reason, duration.toSeconds());
    }

    private static String mask(String key) {
        return key.length() <= 10 ? "***" : key.substring(0, 6) + "..." + key.substring(key.length() - 4);
    }
}
