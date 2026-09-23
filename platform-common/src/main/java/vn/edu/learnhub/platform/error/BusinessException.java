// path: platform-common/src/main/java/vn/edu/learnhub/platform/error/BusinessException.java
// purpose: exception nghiep vu co kem HTTP status. Controller khong can tu tra ResponseEntity loi,
// GlobalExceptionHandler se bat va dong goi ve dung envelope.

package vn.edu.learnhub.platform.error;

import org.springframework.http.HttpStatus;

public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static BusinessException notFound(String message) {
        return new BusinessException(HttpStatus.NOT_FOUND, message);
    }

    public static BusinessException conflict(String message) {
        return new BusinessException(HttpStatus.CONFLICT, message);
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, message);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(HttpStatus.FORBIDDEN, message);
    }

    public static BusinessException unauthorized(String message) {
        return new BusinessException(HttpStatus.UNAUTHORIZED, message);
    }

    /** Service phia sau tam thoi khong goi duoc (dung cho Circuit Breaker / timeout). */
    public static BusinessException unavailable(String message) {
        return new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}
