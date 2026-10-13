package vn.edu.learnhub.platform.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gọi API thanh toán của service khác: ký HMAC và mã hóa Diffie-Hellman + AES-GCM (xem BankCipher).
 * Khóa công khai bên nhận lấy qua /bank-link/handshake, kiểm chữ ký rồi giữ lại; bên nhận khởi động
 * lại thì khóa đổi nên bắt tay lại một lần.
 */
@Component
public class BankLinkCaller {

    @Value("${bank.link.secret:}")
    private String secret;

    @Value("${bank.link.client-id:}")
    private String clientId;

    private final Map<String, PeerKey> peers = new ConcurrentHashMap<>();

    private record PeerKey(String keyId, String publicKey) {
    }

    private record Reply(int status, boolean sealed, byte[] body) {
    }

    public String post(RestClient client, String baseUrl, String path, String json) {
        return post(client, baseUrl, path, json, Map.of());
    }

    public String post(RestClient client, String baseUrl, String path, String json, Map<String, String> headers) {
        if (secret == null || secret.isBlank() || clientId == null || clientId.isBlank()) {
            throw new IllegalStateException("Chua cau hinh khoa giao tiep thanh toan");
        }
        byte[] plain = json.getBytes(StandardCharsets.UTF_8);
        Reply reply = send(client, baseUrl, path, plain, headers, peer(client, baseUrl));
        if (reply.status() == 401 && !reply.sealed()) {
            peers.remove(baseUrl);
            reply = send(client, baseUrl, path, plain, headers, peer(client, baseUrl));
        }
        if (reply.status() >= 400) {
            throw new RestClientResponseException("Kho thanh toan tra loi " + reply.status(),
                    HttpStatusCode.valueOf(reply.status()), "", null, reply.body(), StandardCharsets.UTF_8);
        }
        return new String(reply.body(), StandardCharsets.UTF_8);
    }

    private Reply send(RestClient client, String baseUrl, String path, byte[] plain,
                       Map<String, String> headers, PeerKey peer) {
        BankCipher.Session session = BankCipher.initiate(peer.publicKey());
        byte[] body = session.sealRequest(peer.keyId(), plain, "POST " + path).toJson();
        String timestamp = String.valueOf(System.currentTimeMillis());
        String nonce = UUID.randomUUID().toString();
        String signature = BankLink.sign(secret, clientId, timestamp, nonce, "POST", path, body);
        return client.post()
                .uri(baseUrl + path)
                .headers(h -> headers.forEach(h::set))
                .header(BankLink.CLIENT, clientId)
                .header(BankLink.TIMESTAMP, timestamp)
                .header(BankLink.NONCE, nonce)
                .header(BankLink.SIGNATURE, signature)
                .header(BankCipher.HEADER, BankCipher.SCHEME)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange((request, response) -> {
                    byte[] raw = response.getBody().readAllBytes();
                    boolean sealed = response.getHeaders().containsKey(BankCipher.HEADER);
                    byte[] opened = sealed
                            ? session.openResponse(BankCipher.Envelope.parse(raw), "response " + path)
                            : raw;
                    return new Reply(response.getStatusCode().value(), sealed, opened);
                });
    }

    private PeerKey peer(RestClient client, String baseUrl) {
        PeerKey known = peers.get(baseUrl);
        if (known != null) {
            return known;
        }
        byte[] raw = client.get()
                .uri(baseUrl + BankCipher.HANDSHAKE)
                .retrieve()
                .body(byte[].class);
        BankCipher.Handshake handshake = BankCipher.Handshake.parse(raw == null ? new byte[0] : raw);
        if (!BankLink.handshakeMatches(secret, handshake.keyId(), handshake.publicKey(), handshake.signature())) {
            throw new IllegalStateException("Khoa cong khai cua kho thanh toan sai chu ky");
        }
        PeerKey fresh = new PeerKey(handshake.keyId(), handshake.publicKey());
        peers.put(baseUrl, fresh);
        return fresh;
    }
}
