package vn.edu.learnhub.platform.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Chữ ký liên service cho kho thanh toán.
 * Bên gọi không mở database của bên kia. Mỗi request có client id, thời gian, nonce và HMAC-SHA256
 * trên toàn bộ nội dung, giống cách cổng thanh toán xác thực thông điệp.
 */
public final class BankLink {

    public static final String CLIENT = "X-Bank-Client";
    public static final String TIMESTAMP = "X-Bank-Timestamp";
    public static final String NONCE = "X-Bank-Nonce";
    public static final String SIGNATURE = "X-Bank-Signature";

    private BankLink() {
    }

    public static String sign(String secret, String clientId, String timestamp, String nonce,
                              String method, String path, byte[] body) {
        String canonical = canonical(clientId, timestamp, nonce, method, path, body);
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Khong ky duoc thong diep thanh toan", ex);
        }
    }

    public static boolean matches(String secret, String clientId, String timestamp, String nonce,
                                  String method, String path, byte[] body, String presented) {
        if (presented == null || presented.isBlank()) {
            return false;
        }
        String expected = sign(secret, clientId, timestamp, nonce, method, path, body == null ? new byte[0] : body);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                presented.getBytes(StandardCharsets.UTF_8));
    }

    public static String canonical(String clientId, String timestamp, String nonce,
                                   String method, String path, byte[] body) {
        return clientId + "\n"
                + timestamp + "\n"
                + nonce + "\n"
                + method.toUpperCase() + "\n"
                + path + "\n"
                + sha256(body == null ? new byte[0] : body);
    }

    public static String sha256(byte[] body) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(body));
        } catch (Exception ex) {
            throw new IllegalStateException("Khong bam duoc noi dung", ex);
        }
    }
}
