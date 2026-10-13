package vn.edu.learnhub.platform.security;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.interfaces.DHPublicKey;
import javax.crypto.spec.DHParameterSpec;
import javax.crypto.spec.DHPublicKeySpec;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * Mã hóa gói tin ngân hàng/thanh toán giữa các service theo kiểu ElGamal lai (DHIES).
 * Độ an toàn dựa trên bài toán logarithm rời rạc: biết p, g và y = g^x mod p vẫn không tìm được x.
 * Bên nhận công bố y_B = g^b mod p. Mỗi gói tin bên gửi sinh khóa tạm a và gửi kèm y_A = g^a mod p,
 * hai bên cùng tính được K = g^(ab) mod p (trao đổi khóa Diffie-Hellman). K đi qua HKDF-SHA256 thành
 * hai khóa AES-256-GCM, một cho chiều đi, một cho chiều về. Khóa công khai, IV và bản mã đi trong JSON
 * dưới dạng Base64.
 */
public final class BankCipher {

    public static final String HEADER = "X-Bank-Cipher";
    public static final String SCHEME = "dh-modp2048-aes256gcm";
    public static final String HANDSHAKE = "/bank-link/handshake";

    /** Nhóm MODP 2048-bit của RFC 3526 (nhóm 14): p là số nguyên tố an toàn, g = 2. */
    static final BigInteger P = new BigInteger(
            "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1"
                    + "29024E088A67CC74020BBEA63B139B22514A08798E3404DD"
                    + "EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245"
                    + "E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED"
                    + "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D"
                    + "C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F"
                    + "83655D23DCA3AD961C62F356208552BB9ED529077096966D"
                    + "670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
                    + "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9"
                    + "DE2BCBF6955817183995497CEA956AE515D2261898FA0510"
                    + "15728E5A8AACAA68FFFFFFFFFFFFFFFF", 16);
    static final BigInteger G = BigInteger.TWO;

    private static final DHParameterSpec GROUP = new DHParameterSpec(P, G);
    private static final BigInteger P_MINUS_ONE = P.subtract(BigInteger.ONE);
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ObjectMapper JSON = new ObjectMapper();

    private BankCipher() {
    }

    public static KeyPair newKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("DH");
            generator.initialize(GROUP, RANDOM);
            return generator.generateKeyPair();
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Khong tao duoc cap khoa Diffie-Hellman", ex);
        }
    }

    /** y = g^x mod p, viết Base64. */
    public static String publicKey(KeyPair pair) {
        BigInteger y = ((DHPublicKey) pair.getPublic()).getY();
        return encode(unsigned(y));
    }

    public static String keyId(String publicKey) {
        return BankLink.sha256(publicKey.getBytes(StandardCharsets.UTF_8)).substring(0, 16);
    }

    /** Bên gửi: sinh khóa tạm a rồi tính K = y_B^a mod p. */
    public static Session initiate(String receiverKey) {
        KeyPair ephemeral = newKeyPair();
        String senderKey = publicKey(ephemeral);
        return new Session(senderKey, agree(ephemeral.getPrivate(), receiverKey), receiverKey);
    }

    /** Bên nhận: tính K = y_A^b mod p từ khóa tạm bên gửi gửi kèm gói tin. */
    public static Session accept(KeyPair receiver, String senderKey) {
        return new Session(senderKey, agree(receiver.getPrivate(), senderKey), publicKey(receiver));
    }

    private static byte[] agree(PrivateKey mine, String peerKey) {
        BigInteger y = new BigInteger(1, decode(peerKey));
        // p là số nguyên tố an toàn nên nhóm con nhỏ duy nhất là {1, p-1}; loại chúng để không lộ khóa riêng.
        if (y.compareTo(BigInteger.ONE) <= 0 || y.compareTo(P_MINUS_ONE) >= 0) {
            throw new IllegalArgumentException("Khoa cong khai Diffie-Hellman khong hop le");
        }
        try {
            PublicKey peer = KeyFactory.getInstance("DH").generatePublic(new DHPublicKeySpec(y, P, G));
            KeyAgreement agreement = KeyAgreement.getInstance("DH");
            agreement.init(mine);
            agreement.doPhase(peer, true);
            return agreement.generateSecret();
        } catch (GeneralSecurityException ex) {
            throw new IllegalArgumentException("Khong trao doi duoc khoa Diffie-Hellman", ex);
        }
    }

    /** Khóa của một lượt gọi. Khóa tạm đổi mỗi gói tin nên lộ một phiên không giải được phiên khác. */
    public static final class Session {
        private final String senderKey;
        private final byte[] requestKey;
        private final byte[] responseKey;

        private Session(String senderKey, byte[] shared, String receiverKey) {
            this.senderKey = senderKey;
            byte[] salt = concat(decode(senderKey), decode(receiverKey));
            this.requestKey = hkdf(shared, salt, "learnhub bank-link request");
            this.responseKey = hkdf(shared, salt, "learnhub bank-link response");
            Arrays.fill(shared, (byte) 0);
        }

        public Envelope sealRequest(String keyId, byte[] plain, String aad) {
            byte[] iv = randomIv();
            return new Envelope(keyId, senderKey, encode(iv), encode(aes(Cipher.ENCRYPT_MODE, requestKey, iv, aad, plain)));
        }

        public byte[] openRequest(Envelope envelope, String aad) {
            return aes(Cipher.DECRYPT_MODE, requestKey, decode(envelope.iv()), aad, decode(envelope.data()));
        }

        public Envelope sealResponse(byte[] plain, String aad) {
            byte[] iv = randomIv();
            return new Envelope(null, null, encode(iv), encode(aes(Cipher.ENCRYPT_MODE, responseKey, iv, aad, plain)));
        }

        public byte[] openResponse(Envelope envelope, String aad) {
            return aes(Cipher.DECRYPT_MODE, responseKey, decode(envelope.iv()), aad, decode(envelope.data()));
        }
    }

    /** Gói tin trên đường truyền: kid = khóa bên nhận, epk = y_A, iv và data (bản mã + thẻ GCM) đều Base64. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Envelope(String kid, String epk, String iv, String data) {

        public byte[] toJson() {
            return write(this);
        }

        public static Envelope parse(byte[] json) {
            Envelope envelope = read(json, Envelope.class);
            if (envelope.iv() == null || envelope.data() == null) {
                throw new IllegalArgumentException("Goi tin thanh toan chua duoc ma hoa");
            }
            return envelope;
        }
    }

    /** Khóa công khai bên nhận công bố, kèm HMAC bằng bank.link.secret để bên gửi biết không bị tráo. */
    public record Handshake(String keyId, String publicKey, String signature) {

        public byte[] toJson() {
            return write(this);
        }

        public static Handshake parse(byte[] json) {
            return read(json, Handshake.class);
        }
    }

    private static byte[] aes(int mode, byte[] key, byte[] iv, String aad, byte[] input) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
            return cipher.doFinal(input);
        } catch (GeneralSecurityException ex) {
            throw new IllegalArgumentException("Goi tin thanh toan bi sua hoac sai khoa", ex);
        }
    }

    private static byte[] hkdf(byte[] secret, byte[] salt, String info) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(salt, "HmacSHA256"));
            byte[] prk = mac.doFinal(secret);
            mac.init(new SecretKeySpec(prk, "HmacSHA256"));
            mac.update(info.getBytes(StandardCharsets.UTF_8));
            mac.update((byte) 1);
            return mac.doFinal();
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Khong dan xuat duoc khoa AES", ex);
        }
    }

    private static byte[] randomIv() {
        byte[] iv = new byte[IV_BYTES];
        RANDOM.nextBytes(iv);
        return iv;
    }

    private static byte[] unsigned(BigInteger value) {
        byte[] bytes = value.toByteArray();
        return bytes.length > 1 && bytes[0] == 0 ? Arrays.copyOfRange(bytes, 1, bytes.length) : bytes;
    }

    private static byte[] concat(byte[] a, byte[] b) {
        byte[] out = Arrays.copyOf(a, a.length + b.length);
        System.arraycopy(b, 0, out, a.length, b.length);
        return out;
    }

    private static String encode(byte[] bytes) {
        return Base64.getEncoder().encodeToString(bytes);
    }

    private static byte[] decode(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Thieu du lieu Base64");
        }
        return Base64.getDecoder().decode(text);
    }

    private static byte[] write(Object value) {
        try {
            return JSON.writeValueAsBytes(value);
        } catch (IOException ex) {
            throw new IllegalStateException("Khong dong goi duoc goi tin", ex);
        }
    }

    private static <T> T read(byte[] json, Class<T> type) {
        try {
            return JSON.readValue(json, type);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Goi tin thanh toan khong dung dinh dang", ex);
        }
    }
}
