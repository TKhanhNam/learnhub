package vn.edu.learnhub.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import vn.edu.learnhub.payment.entity.PaymentTransaction;
import vn.edu.learnhub.payment.repository.PaymentTransactionRepository;
import vn.edu.learnhub.platform.error.BusinessException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;

@Service
public class MomoGateway {
    private final PaymentTransactionRepository transactions;
    private final ObjectMapper objectMapper;
    private final RestClient http;
    private final String endpoint;
    private final String partnerCode;
    private final String accessKey;
    private final String secretKey;
    private final String requestType;
    private final String redirectUrl;
    private final String ipnUrl;

    public MomoGateway(PaymentTransactionRepository transactions, ObjectMapper objectMapper,
                       @Value("${momo.endpoint}") String endpoint,
                       @Value("${momo.partner-code:}") String partnerCode,
                       @Value("${momo.access-key:}") String accessKey,
                       @Value("${momo.secret-key:}") String secretKey,
                       @Value("${momo.request-type}") String requestType,
                       @Value("${momo.redirect-url}") String redirectUrl,
                       @Value("${momo.ipn-url}") String ipnUrl,
                       @Value("${momo.verify-ssl:true}") boolean verifySsl) {
        this.transactions = transactions;
        this.objectMapper = objectMapper;
        this.endpoint = endpoint;
        this.partnerCode = partnerCode;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.requestType = requestType;
        this.redirectUrl = redirectUrl;
        this.ipnUrl = ipnUrl;
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(20));
        this.http = RestClient.builder().requestFactory(factory).build();
        if (!verifySsl) {
            // Giữ cờ để khớp cấu hình sandbox của bài mẫu. Mặc định vẫn kiểm SSL.
        }
    }

    public String create(long commerceOrderId, long amount, String orderInfo) {
        if (partnerCode.isBlank() || accessKey.isBlank() || secretKey.isBlank()) {
            throw BusinessException.unavailable("Chua cau hinh khoa MoMo trong payment-service");
        }
        PaymentTransaction tx = new PaymentTransaction();
        tx.setCommerceOrderId(commerceOrderId);
        tx.setGateway("momo");
        tx.setAmount(amount);
        tx.setStatus("pending");
        tx.setCreatedAt(Instant.now());
        tx = transactions.save(tx);

        String requestId = String.valueOf(System.currentTimeMillis());
        String orderId = commerceOrderId + "_" + tx.getId() + "_" + requestId;
        String extraData = String.valueOf(commerceOrderId);
        String raw = "accessKey=" + accessKey
                + "&amount=" + amount
                + "&extraData=" + extraData
                + "&ipnUrl=" + ipnUrl
                + "&orderId=" + orderId
                + "&orderInfo=" + orderInfo
                + "&partnerCode=" + partnerCode
                + "&redirectUrl=" + redirectUrl
                + "&requestId=" + requestId
                + "&requestType=" + requestType;
        Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("partnerCode", partnerCode);
        data.put("partnerName", "LearnHub");
        data.put("storeId", "LearnHub");
        data.put("requestId", requestId);
        data.put("amount", amount);
        data.put("orderId", orderId);
        data.put("orderInfo", orderInfo);
        data.put("redirectUrl", redirectUrl);
        data.put("ipnUrl", ipnUrl);
        data.put("lang", "vi");
        data.put("extraData", extraData);
        data.put("requestType", requestType);
        data.put("signature", hmac(raw));
        tx.setGatewayOrderId(orderId);
        transactions.save(tx);
        String rawResponse = http.post().uri(endpoint).body(data).retrieve().body(String.class);
        try {
            JsonNode result = objectMapper.readTree(rawResponse == null ? "{}" : rawResponse);
            String payUrl = result.path("payUrl").asText("");
            tx.setResultCode(result.path("resultCode").isMissingNode() ? null : result.path("resultCode").asInt());
            tx.setMessage(result.path("message").asText(null));
            tx.setStatus(payUrl.isBlank() ? "failed" : "initiated");
            transactions.save(tx);
            if (payUrl.isBlank()) {
                throw BusinessException.badRequest(result.path("message").asText("Khong tao duoc giao dich MoMo"));
            }
            return payUrl;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            tx.setStatus("failed");
            tx.setMessage(ex.getMessage());
            transactions.save(tx);
            throw BusinessException.unavailable("Khong ket noi duoc MoMo");
        }
    }

    public boolean valid(Map<String, String> payload) {
        if (!payload.containsKey("signature")) {
            return false;
        }
        String raw = "accessKey=" + accessKey
                + "&amount=" + payload.getOrDefault("amount", "")
                + "&extraData=" + payload.getOrDefault("extraData", "")
                + "&message=" + payload.getOrDefault("message", "")
                + "&orderId=" + payload.getOrDefault("orderId", "")
                + "&orderInfo=" + payload.getOrDefault("orderInfo", "")
                + "&orderType=" + payload.getOrDefault("orderType", "")
                + "&partnerCode=" + payload.getOrDefault("partnerCode", "")
                + "&payType=" + payload.getOrDefault("payType", "")
                + "&requestId=" + payload.getOrDefault("requestId", "")
                + "&responseTime=" + payload.getOrDefault("responseTime", "")
                + "&resultCode=" + payload.getOrDefault("resultCode", "")
                + "&transId=" + payload.getOrDefault("transId", "");
        return java.security.MessageDigest.isEqual(
                hmac(raw).getBytes(StandardCharsets.UTF_8),
                payload.get("signature").getBytes(StandardCharsets.UTF_8));
    }

    public PaymentTransaction apply(Map<String, String> payload) {
        PaymentTransaction tx = transactions.findByGatewayAndGatewayOrderId("momo", payload.getOrDefault("orderId", ""))
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay giao dich MoMo"));
        if ("paid".equals(tx.getStatus())) {
            return tx;
        }
        long amount;
        try {
            amount = Long.parseLong(payload.getOrDefault("amount", "0"));
        } catch (NumberFormatException ex) {
            amount = -1;
        }
        if (amount != tx.getAmount()) {
            tx.setStatus("failed");
            tx.setMessage("Sai so tien");
            return transactions.save(tx);
        }
        boolean ok = "0".equals(payload.get("resultCode"));
        tx.setStatus(ok ? "paid" : "failed");
        try {
            tx.setResultCode(Integer.valueOf(payload.getOrDefault("resultCode", "-1")));
        } catch (NumberFormatException ex) {
            tx.setResultCode(-1);
        }
        tx.setMessage(payload.get("message"));
        tx.setTransId(payload.get("transId"));
        if (ok) {
            tx.setPaidAt(Instant.now());
        }
        return transactions.save(tx);
    }

    private String hmac(String raw) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Khong ky duoc MoMo", ex);
        }
    }
}
