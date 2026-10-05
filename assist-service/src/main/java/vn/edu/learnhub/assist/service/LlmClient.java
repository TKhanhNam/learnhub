package vn.edu.learnhub.assist.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import vn.edu.learnhub.platform.error.BusinessException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class LlmClient {
    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);
    private static final String URL = "https://openrouter.ai/api/v1/chat/completions";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public LlmClient(ObjectMapper objectMapper,
                     @Value("${assist.openrouter-key:}") String apiKey) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(40));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public boolean configured() {
        return !apiKey.isBlank();
    }

    public String complete(String model, String system, String question) {
        if (!configured()) {
            throw BusinessException.unavailable("Tro ly AI chua duoc cau hinh");
        }
        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", 0.3,
                "max_tokens", 500,
                "messages", List.of(
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", question)
                )
        );
        try {
            String raw = restClient.post()
                    .uri(URL)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("HTTP-Referer", "http://localhost:5173")
                    .header("X-Title", "LearnHub")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode root = objectMapper.readTree(raw == null ? "{}" : raw);
            String text = root.path("choices").path(0).path("message").path("content").asText("").trim();
            if (text.isBlank()) {
                throw BusinessException.unavailable("Tro ly AI khong tra loi duoc luc nay");
            }
            return text;
        } catch (RestClientResponseException ex) {
            log.warn("OpenRouter tu choi model {} status {}", model, ex.getStatusCode().value());
            throw BusinessException.unavailable("Tro ly AI dang ban, vui long thu lai sau");
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Khong goi duoc OpenRouter: {}", ex.getMessage());
            throw BusinessException.unavailable("Khong ket noi duoc tro ly AI, vui long thu lai sau");
        }
    }
}
