package vn.edu.learnhub.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import vn.edu.learnhub.payment.entity.PaymentTransaction;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.BankLink;
import vn.edu.learnhub.platform.security.InternalKeyFilter;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class CommerceNotifier {
    private final RestClient http;
    private final ObjectMapper objectMapper;
    private final String commerceUrl;
    private final String secret;
    private final String internalKey;

    public CommerceNotifier(RestClient.Builder builder,
                            ObjectMapper objectMapper,
                            @Value("${payment.commerce-url}") String commerceUrl,
                            @Value("${bank.link.secret}") String secret,
                            @Value("${internal.api-key}") String internalKey) {
        this.http = builder.build();
        this.objectMapper = objectMapper;
        this.commerceUrl = commerceUrl;
        this.secret = secret;
        this.internalKey = internalKey;
    }

    public void confirm(PaymentTransaction tx) {
        post("/internal/payments/momo-confirm", body(tx, true));
    }

    public void fail(PaymentTransaction tx) {
        post("/internal/payments/momo-fail", body(tx, false));
    }

    private Map<String, Object> body(PaymentTransaction tx, boolean paid) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("commerceOrderId", tx.getCommerceOrderId());
        body.put("amount", tx.getAmount());
        if (paid) {
            body.put("paymentRef", tx.getTransId() == null ? tx.getGatewayOrderId() : tx.getTransId());
        }
        return body;
    }

    private void post(String path, Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            String timestamp = String.valueOf(System.currentTimeMillis());
            String nonce = UUID.randomUUID().toString();
            String signature = BankLink.sign(secret, "payment-service", timestamp, nonce, "POST", path, bytes);
            http.post()
                    .uri(commerceUrl + path)
                    .header(BankLink.CLIENT, "payment-service")
                    .header(BankLink.TIMESTAMP, timestamp)
                    .header(BankLink.NONCE, nonce)
                    .header(BankLink.SIGNATURE, signature)
                    .header(InternalKeyFilter.HEADER, internalKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(json)
                    .retrieve()
                    .toBodilessEntity();
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw BusinessException.unavailable("Khong xac nhan duoc don hang voi commerce-service");
        }
    }
}
