package vn.edu.learnhub.platform.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
public class BankLinkCaller {

    @Value("${bank.link.secret:}")
    private String secret;

    @Value("${bank.link.client-id:}")
    private String clientId;

    public String post(RestClient client, String baseUrl, String path, String json) {
        if (secret == null || secret.isBlank() || clientId == null || clientId.isBlank()) {
            throw new IllegalStateException("Chua cau hinh khoa giao tiep thanh toan");
        }
        byte[] body = json.getBytes(StandardCharsets.UTF_8);
        String timestamp = String.valueOf(System.currentTimeMillis());
        String nonce = UUID.randomUUID().toString();
        String signature = BankLink.sign(secret, clientId, timestamp, nonce, "POST", path, body);
        return client.post()
                .uri(baseUrl + path)
                .header(BankLink.CLIENT, clientId)
                .header(BankLink.TIMESTAMP, timestamp)
                .header(BankLink.NONCE, nonce)
                .header(BankLink.SIGNATURE, signature)
                .contentType(MediaType.APPLICATION_JSON)
                .body(json)
                .retrieve()
                .body(String.class);
    }
}
