// path: platform-common/src/main/java/vn/edu/learnhub/platform/api/ApiResponse.java
// purpose: envelope JSON THONG NHAT cho moi API cua he thong (file cong nghe loi muc 2):
// { success, code, message, data, errors, meta, timestamp }
// Nho vay Frontend chi viet 1 lan logic boc tach du lieu va doc loi.

package vn.edu.learnhub.platform.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.data.domain.Page;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.ALWAYS)
public class ApiResponse<T> {

    private boolean success;
    private int code;
    private String message;
    private T data;
    private List<ApiError> errors;
    private Map<String, Object> meta;
    private String timestamp;

    public ApiResponse() {
        this.timestamp = Instant.now().toString();
    }

    public static <T> ApiResponse<T> ok(T data) {
        return ok(data, "Thanh cong");
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = true;
        response.code = 200;
        response.message = message;
        response.data = data;
        return response;
    }

    public static <T> ApiResponse<T> created(T data, String message) {
        ApiResponse<T> response = ok(data, message);
        response.code = 201;
        return response;
    }

    public static <T> ApiResponse<T> accepted(T data, String message) {
        ApiResponse<T> response = ok(data, message);
        response.code = 202;
        return response;
    }

    /**
     * Dong goi Page cua Spring Data thanh envelope: data = danh sach, meta = thong tin phan trang.
     * Frontend luon doc data + meta.totalPages, khong phu thuoc cau truc Page cua Spring.
     */
    public static <T> ApiResponse<List<T>> page(Page<T> page) {
        ApiResponse<List<T>> response = ok(page.getContent());
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("page", page.getNumber());
        meta.put("limit", page.getSize());
        meta.put("total", page.getTotalElements());
        meta.put("totalPages", page.getTotalPages());
        response.meta = meta;
        return response;
    }

    public static <T> ApiResponse<T> failure(int code, String message, List<ApiError> errors) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.code = code;
        response.message = message;
        response.errors = errors;
        return response;
    }

    public ApiResponse<T> withMeta(String key, Object value) {
        if (this.meta == null) {
            this.meta = new LinkedHashMap<>();
        }
        this.meta.put(key, value);
        return this;
    }

    public boolean isSuccess() {
        return success;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public T getData() {
        return data;
    }

    public List<ApiError> getErrors() {
        return errors;
    }

    public Map<String, Object> getMeta() {
        return meta;
    }

    public String getTimestamp() {
        return timestamp;
    }
}
