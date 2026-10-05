package vn.edu.learnhub.commerce.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.BankLinkCaller;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class PaymentClient {
    private final BankLinkCaller caller;
    private final RestClient http;
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    public PaymentClient(BankLinkCaller caller,
                         RestClient.Builder builder,
                         ObjectMapper objectMapper,
                         @Value("${services.payment-url:http://localhost:8089}") String baseUrl) {
        this.caller = caller;
        this.http = builder.build();
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl;
    }

    public String createMomo(long orderId, long amount, String orderInfo) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("commerceOrderId", orderId);
            payload.put("amount", amount);
            payload.put("orderInfo", orderInfo);
            String json = objectMapper.writeValueAsString(payload);
            String raw = caller.post(http, baseUrl, "/link/momo/create", json);
            JsonNode node = objectMapper.readTree(raw == null ? "{}" : raw);
            String url = node.path("data").path("payUrl").asText("");
            if (url.isBlank()) {
                throw BusinessException.badRequest(node.path("message").asText("Khong tao duoc giao dich MoMo"));
            }
            return url;
        } catch (BusinessException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            throw BusinessException.unavailable("Kho thanh toan tu choi yeu cau");
        } catch (Exception ex) {
            throw BusinessException.unavailable("Khong ket noi duoc kho thanh toan");
        }
    }
}
