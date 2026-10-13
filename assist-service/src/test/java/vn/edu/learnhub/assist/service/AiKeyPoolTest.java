package vn.edu.learnhub.assist.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import vn.edu.learnhub.assist.dto.AssistDtos;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServiceUnavailable;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withTooManyRequests;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

class AiKeyPoolTest {

    private static final Map<AiKeyPool.Provider, String> MODELS = Map.of(
            AiKeyPool.Provider.GROQ, "openai/gpt-oss-120b",
            AiKeyPool.Provider.GEMINI, "gemini-3.8-flash",
            AiKeyPool.Provider.OPENROUTER, "openrouter/free");

    private MockRestServiceServer server;
    private RestClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = builder.build();
    }

    @Test
    @DisplayName("Key 1 hết lượt (429) thì chuyển sang key 2, lần sau bỏ qua key 1 đang nghỉ")
    void switchesToNextKeyWhenRateLimited() {
        server.expect(requestTo(AiKeyPool.Provider.GROQ.url))
                .andExpect(header("Authorization", "Bearer gsk_first_key_123"))
                .andRespond(withTooManyRequests(120));
        server.expect(requestTo(AiKeyPool.Provider.GROQ.url))
                .andExpect(header("Authorization", "Bearer gsk_second_key_456"))
                .andRespond(withSuccess(reply("Xin chao"), MediaType.APPLICATION_JSON));
        server.expect(requestTo(AiKeyPool.Provider.GROQ.url))
                .andExpect(header("Authorization", "Bearer gsk_second_key_456"))
                .andRespond(withSuccess(reply("Lan hai"), MediaType.APPLICATION_JSON));
        AiKeyPool pool = new AiKeyPool("gsk_first_key_123,gsk_second_key_456", MODELS, client);

        assertEquals(Optional.of("Xin chao"), pool.ask("system", "hoi"));
        assertEquals(Optional.of("Lan hai"), pool.ask("system", "hoi"));

        server.verify();
        List<AssistDtos.AiKeyDTO> table = pool.status();
        assertEquals("TAM_NGHI", table.get(0).state());
        assertEquals("HTTP 429", table.get(0).lastError());
        assertEquals("SAN_SANG", table.get(1).state());
        assertEquals(2, table.get(1).answered());
    }

    @Test
    @DisplayName("Key sai (401) và nhà cung cấp quá tải (503) thì chuyển sang nhà cung cấp khác")
    void crossesProviders() {
        server.expect(requestTo(AiKeyPool.Provider.GROQ.url)).andRespond(withUnauthorizedRequest());
        server.expect(requestTo(AiKeyPool.Provider.GEMINI.url)).andRespond(withServiceUnavailable());
        server.expect(requestTo(AiKeyPool.Provider.OPENROUTER.url))
                .andExpect(jsonPath("$.model").value("openrouter/free"))
                .andRespond(withSuccess(reply("Tu OpenRouter"), MediaType.APPLICATION_JSON));
        AiKeyPool pool = new AiKeyPool("gsk_bad_key_000,AIzaSyGeminiKey00,sk-or-v1-open-key", MODELS, client);

        assertEquals(Optional.of("Tu OpenRouter"), pool.ask("system", "hoi"));
        server.verify();
    }

    @Test
    @DisplayName("Mọi key đều lỗi thì trả rỗng để trợ lý dùng câu trả lời có sẵn")
    void emptyWhenAllKeysFail() {
        server.expect(requestTo(AiKeyPool.Provider.GROQ.url)).andRespond(withTooManyRequests());
        AiKeyPool pool = new AiKeyPool("gsk_only_key_789", MODELS, client);

        assertTrue(pool.ask("system", "hoi").isEmpty());
        assertTrue(pool.ask("system", "hoi").isEmpty());
        server.verify();
    }

    @Test
    @DisplayName("Bảng trạng thái che key và bỏ qua key không rõ nhà cung cấp")
    void statusMasksKeys() {
        AiKeyPool pool = new AiKeyPool("gsk_abcdefghijklmnop, xyz_unknown_key_1, AIzaSyGeminiKey00", MODELS, client);

        List<AssistDtos.AiKeyDTO> table = pool.status();
        assertEquals(2, table.size());
        assertEquals("gsk_ab...mnop", table.get(0).key());
        assertEquals("Gemini", table.get(1).provider());
        assertEquals(2, table.get(1).number());
    }

    private static String reply(String text) {
        return "{\"choices\":[{\"message\":{\"content\":\"" + text + "\"}}]}";
    }
}
