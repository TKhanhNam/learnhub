package vn.edu.learnhub.platform.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.mock.http.client.MockClientHttpResponse;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;

/** Bên gửi -> đường truyền -> BankLinkGuard -> controller và chiều ngược lại, không cần bật service thật. */
class BankLinkRoundTripTest {

    private static final String SECRET = "test-bank-link-secret";
    private static final String BASE = "http://payment.test";
    private static final String PATH = "/link/momo/create";
    private static final String PAYMENT = "{\"commerceOrderId\":42,\"amount\":663200}";
    private static final String PAY_URL = "{\"data\":{\"payUrl\":\"https://pay.example/ok\"}}";

    private final List<String> wireRequests = new ArrayList<>();
    private final List<String> wireReplies = new ArrayList<>();
    private final List<String> seenByController = new ArrayList<>();
    private int handshakes;
    private BankLinkGuard guard;
    private RestClient client;
    private BankLinkCaller caller;

    @BeforeEach
    void setUp() {
        guard = newGuard(SECRET);
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).ignoreExpectOrder(true).build();
        server.expect(ExpectedCount.manyTimes(), anything()).andRespond(this::dispatch);
        client = builder.build();
        caller = new BankLinkCaller();
        ReflectionTestUtils.setField(caller, "secret", SECRET);
        ReflectionTestUtils.setField(caller, "clientId", "commerce-service");
    }

    @Test
    @DisplayName("Gói tin thanh toán đi và về đều là bản mã Base64, controller vẫn nhận JSON rõ")
    void paymentPacketIsEncryptedOnTheWire() {
        String reply = caller.post(client, BASE, PATH, PAYMENT);

        assertEquals(PAY_URL, reply);
        assertEquals(List.of(PAYMENT), seenByController);
        assertFalse(wireRequests.get(0).contains("663200"));
        assertTrue(wireRequests.get(0).contains("\"epk\""));
        assertFalse(wireReplies.get(0).contains("payUrl"));
        assertTrue(wireReplies.get(0).contains("\"data\""));
    }

    @Test
    @DisplayName("Gói tin có chữ ký nhưng không mã hóa bị từ chối")
    void plainPacketIsRejected() throws Exception {
        byte[] body = PAYMENT.getBytes(StandardCharsets.UTF_8);
        String timestamp = String.valueOf(System.currentTimeMillis());
        MockHttpServletRequest request = new MockHttpServletRequest("POST", PATH);
        request.addHeader(BankLink.CLIENT, "commerce-service");
        request.addHeader(BankLink.TIMESTAMP, timestamp);
        request.addHeader(BankLink.NONCE, "n-1");
        request.addHeader(BankLink.SIGNATURE,
                BankLink.sign(SECRET, "commerce-service", timestamp, "n-1", "POST", PATH, body));
        request.setContent(body);
        MockHttpServletResponse response = new MockHttpServletResponse();

        guard.doFilter(request, response, new MockFilterChain(controller()));

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("phai duoc ma hoa"));
        assertTrue(seenByController.isEmpty());
    }

    @Test
    @DisplayName("Bên nhận khởi động lại (đổi khóa) thì bên gửi bắt tay lại và gửi được")
    void receiverRestartTriggersNewHandshake() {
        caller.post(client, BASE, PATH, PAYMENT);
        guard = newGuard(SECRET);

        assertEquals(PAY_URL, caller.post(client, BASE, PATH, PAYMENT));
        assertEquals(2, handshakes);
        assertEquals(2, seenByController.size());
    }

    @Test
    @DisplayName("Khóa công khai bị tráo (sai HMAC) thì không gửi gói tin")
    void forgedHandshakeIsRejected() {
        guard = newGuard("attacker-secret");

        assertThrows(IllegalStateException.class, () -> caller.post(client, BASE, PATH, PAYMENT));
        assertTrue(wireRequests.isEmpty());
    }

    private BankLinkGuard newGuard(String secret) {
        BankLinkGuard created = new BankLinkGuard();
        ReflectionTestUtils.setField(created, "protect", "/link/");
        ReflectionTestUtils.setField(created, "secret", secret);
        ReflectionTestUtils.setField(created, "allow", "commerce-service,payment-service");
        return created;
    }

    private HttpServlet controller() {
        return new HttpServlet() {
            @Override
            protected void doPost(HttpServletRequest req, HttpServletResponse res) throws IOException {
                seenByController.add(new String(req.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
                res.setContentType("application/json");
                res.getWriter().write(PAY_URL);
            }
        };
    }

    private ClientHttpResponse dispatch(ClientHttpRequest request) throws IOException {
        MockClientHttpRequest sent = (MockClientHttpRequest) request;
        byte[] body = sent.getBodyAsBytes();
        MockHttpServletRequest in = new MockHttpServletRequest(sent.getMethod().name(), sent.getURI().getPath());
        sent.getHeaders().forEach((name, values) -> values.forEach(value -> in.addHeader(name, value)));
        in.setContent(body);
        boolean post = sent.getMethod() == HttpMethod.POST;
        if (post) {
            wireRequests.add(new String(body, StandardCharsets.UTF_8));
        } else {
            handshakes++;
        }

        MockHttpServletResponse out = new MockHttpServletResponse();
        try {
            guard.doFilter(in, out, new MockFilterChain(controller()));
        } catch (ServletException ex) {
            throw new IOException(ex);
        }
        if (post) {
            wireReplies.add(out.getContentAsString());
        }

        MockClientHttpResponse response = new MockClientHttpResponse(out.getContentAsByteArray(),
                HttpStatusCode.valueOf(out.getStatus()));
        for (String name : out.getHeaderNames()) {
            response.getHeaders().addAll(name, out.getHeaders(name));
        }
        return response;
    }
}
