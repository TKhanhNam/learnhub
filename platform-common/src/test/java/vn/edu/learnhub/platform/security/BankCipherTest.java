package vn.edu.learnhub.platform.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class BankCipherTest {

    private static final byte[] PAYMENT = "{\"commerceOrderId\":42,\"amount\":663200}".getBytes(StandardCharsets.UTF_8);
    private static final String AAD = "POST /link/momo/create";

    @Test
    @DisplayName("Nhóm Diffie-Hellman là số nguyên tố an toàn 2048-bit")
    void groupIsSafePrime() {
        assertEquals(2048, BankCipher.P.bitLength());
        assertTrue(BankCipher.P.isProbablePrime(40));
        assertTrue(BankCipher.P.subtract(BigInteger.ONE).shiftRight(1).isProbablePrime(40));
    }

    @Test
    @DisplayName("Hai bên tính ra cùng khóa và mở được gói tin của nhau")
    void roundTrip() {
        KeyPair receiver = BankCipher.newKeyPair();
        String receiverKey = BankCipher.publicKey(receiver);

        BankCipher.Session sender = BankCipher.initiate(receiverKey);
        BankCipher.Envelope envelope = sender.sealRequest(BankCipher.keyId(receiverKey), PAYMENT, AAD);

        BankCipher.Session opened = BankCipher.accept(receiver, envelope.epk());
        assertArrayEquals(PAYMENT, opened.openRequest(envelope, AAD));

        byte[] reply = "{\"payUrl\":\"https://pay.example\"}".getBytes(StandardCharsets.UTF_8);
        BankCipher.Envelope answer = opened.sealResponse(reply, "response /link/momo/create");
        assertArrayEquals(reply, sender.openResponse(answer, "response /link/momo/create"));
    }

    @Test
    @DisplayName("Gói tin trên đường truyền là Base64, không lộ số tiền")
    void wireIsBase64Ciphertext() {
        String receiverKey = BankCipher.publicKey(BankCipher.newKeyPair());
        BankCipher.Envelope envelope = BankCipher.initiate(receiverKey).sealRequest("kid", PAYMENT, AAD);
        String wire = new String(envelope.toJson(), StandardCharsets.UTF_8);

        assertFalse(wire.contains("663200"));
        assertFalse(wire.contains("commerceOrderId"));
        assertDoesNotThrow(() -> Base64.getDecoder().decode(envelope.data()));
        assertDoesNotThrow(() -> Base64.getDecoder().decode(envelope.epk()));
        assertEquals(12, Base64.getDecoder().decode(envelope.iv()).length);
    }

    @Test
    @DisplayName("Sửa một byte bản mã hoặc đổi đường dẫn thì không mở được")
    void tamperIsRejected() {
        KeyPair receiver = BankCipher.newKeyPair();
        BankCipher.Envelope envelope = BankCipher.initiate(BankCipher.publicKey(receiver))
                .sealRequest("kid", PAYMENT, AAD);
        BankCipher.Session opened = BankCipher.accept(receiver, envelope.epk());

        byte[] data = Base64.getDecoder().decode(envelope.data());
        data[0] ^= 1;
        BankCipher.Envelope edited = new BankCipher.Envelope(envelope.kid(), envelope.epk(), envelope.iv(),
                Base64.getEncoder().encodeToString(data));

        assertThrows(IllegalArgumentException.class, () -> opened.openRequest(edited, AAD));
        assertThrows(IllegalArgumentException.class, () -> opened.openRequest(envelope, "POST /link/other"));
    }

    @Test
    @DisplayName("Khóa của người khác không mở được gói tin")
    void otherReceiverCannotOpen() {
        KeyPair receiver = BankCipher.newKeyPair();
        KeyPair stranger = BankCipher.newKeyPair();
        BankCipher.Envelope envelope = BankCipher.initiate(BankCipher.publicKey(receiver))
                .sealRequest("kid", PAYMENT, AAD);

        BankCipher.Session wrong = BankCipher.accept(stranger, envelope.epk());
        assertThrows(IllegalArgumentException.class, () -> wrong.openRequest(envelope, AAD));
    }

    @Test
    @DisplayName("Từ chối khóa công khai 1 và p-1 (nhóm con nhỏ)")
    void weakPublicKeysAreRejected() {
        KeyPair receiver = BankCipher.newKeyPair();
        String one = Base64.getEncoder().encodeToString(BigInteger.ONE.toByteArray());
        String minusOne = Base64.getEncoder().encodeToString(BankCipher.P.subtract(BigInteger.ONE).toByteArray());

        assertThrows(IllegalArgumentException.class, () -> BankCipher.accept(receiver, one));
        assertThrows(IllegalArgumentException.class, () -> BankCipher.accept(receiver, minusOne));
    }
}
