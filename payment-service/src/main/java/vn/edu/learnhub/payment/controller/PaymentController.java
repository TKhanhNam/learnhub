package vn.edu.learnhub.payment.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.payment.service.MomoGateway;
import vn.edu.learnhub.payment.service.PaymentFlow;
import vn.edu.learnhub.platform.api.ApiResponse;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class PaymentController {
    private final MomoGateway momo;
    private final PaymentFlow flow;
    private final ObjectMapper objectMapper;
    private final String webResultUrl;

    public PaymentController(MomoGateway momo, PaymentFlow flow, ObjectMapper objectMapper,
                             @Value("${payment.web-result-url}") String webResultUrl) {
        this.momo = momo;
        this.flow = flow;
        this.objectMapper = objectMapper;
        this.webResultUrl = webResultUrl;
    }

    public record CreateRequest(long commerceOrderId, long amount, String orderInfo) {}

    @PostMapping("/link/momo/create")
    public ApiResponse<Map<String, String>> create(@RequestBody CreateRequest request) {
        String payUrl = momo.create(request.commerceOrderId(), request.amount(),
                request.orderInfo() == null || request.orderInfo().isBlank()
                        ? "Thanh toan LearnHub"
                        : request.orderInfo());
        return ApiResponse.ok(Map.of("payUrl", payUrl), "Da tao giao dich MoMo");
    }

    @GetMapping("/payment/momo/return")
    public void returned(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String status = safeFinish(fromRequest(request, null));
        String target = webResultUrl + "?status=" + URLEncoder.encode(status, StandardCharsets.UTF_8);
        response.sendRedirect(target);
    }

    @PostMapping("/payment/momo/ipn")
    public Map<String, String> ipn(HttpServletRequest request) throws IOException {
        String body = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        safeFinish(fromRequest(request, body));
        return Map.of("message", "Received");
    }

    private String safeFinish(Map<String, String> payload) {
        try {
            return flow.finish(payload);
        } catch (Exception ex) {
            return "error";
        }
    }

    private Map<String, String> fromRequest(HttpServletRequest request, String body) throws IOException {
        Map<String, String> payload = new LinkedHashMap<>();
        if (body != null && body.trim().startsWith("{")) {
            JsonNode node = objectMapper.readTree(body);
            node.fields().forEachRemaining(entry -> payload.put(entry.getKey(), entry.getValue().asText("")));
            return payload;
        }
        request.getParameterMap().forEach((key, value) ->
                payload.put(key, value == null || value.length == 0 ? "" : value[0]));
        return payload;
    }
}
