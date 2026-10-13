package vn.edu.learnhub.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import vn.edu.learnhub.payment.entity.PaymentTransaction;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.BankLinkCaller;
import vn.edu.learnhub.platform.security.InternalKeyFilter;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class CommerceNotifier {
    private final BankLinkCaller caller;
    private final RestClient http;
    private final ObjectMapper objectMapper;
    private final String commerceUrl;
    private final String internalKey;

    public CommerceNotifier(BankLinkCaller caller,
                            RestClient.Builder builder,
                            ObjectMapper objectMapper,
                            @Value("${payment.commerce-url}") String commerceUrl,
                            @Value("${internal.api-key}") String internalKey) {
        this.caller = caller;
        this.http = builder.build();
        this.objectMapper = objectMapper;
        this.commerceUrl = commerceUrl;
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
            caller.post(http, commerceUrl, path, json, Map.of(InternalKeyFilter.HEADER, internalKey));
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw BusinessException.unavailable("Khong xac nhan duoc don hang voi commerce-service");
        }
    }
}
