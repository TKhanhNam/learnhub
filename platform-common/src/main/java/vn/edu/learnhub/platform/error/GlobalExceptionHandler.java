// path: platform-common/src/main/java/vn/edu/learnhub/platform/error/GlobalExceptionHandler.java
// purpose: chuan hoa MOI loi ve envelope chung, khong bao gio lo stack trace ra client (Buoi 2).
// Dung chung cho ca 8 service nho scanBasePackages trong class Application.

package vn.edu.learnhub.platform.error;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import vn.edu.learnhub.platform.api.ApiError;
import vn.edu.learnhub.platform.api.ApiResponse;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex) {
        return build(ex.getStatus(), ex.getMessage(), List.of(ApiError.of(ex.getMessage())));
    }

    /** Loi validate DTO dau vao: tra ve tung field sai de Frontend to do dung o input. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        List<ApiError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> new ApiError(fieldError.getField(), fieldError.getDefaultMessage()))
                .toList();
        return build(HttpStatus.BAD_REQUEST, "Du lieu gui len khong hop le", errors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraint(ConstraintViolationException ex) {
        return build(HttpStatus.BAD_REQUEST, "Du lieu gui len khong hop le",
                List.of(ApiError.of(ex.getMessage())));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleIntegrity(DataIntegrityViolationException ex) {
        log.warn("Vi pham rang buoc du lieu: {}", ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT, "Du lieu bi trung hoac vi pham rang buoc",
                List.of(ApiError.of("Du lieu bi trung hoac vi pham rang buoc")));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, "Ban khong co quyen thuc hien chuc nang nay",
                List.of(ApiError.of("Khong du quyen")));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "Duong dan khong ton tai",
                List.of(ApiError.of("Duong dan khong ton tai")));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Loi khong mong doi", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Da co loi xay ra, vui long thu lai sau",
                List.of(ApiError.of("Loi he thong")));
    }

    private ResponseEntity<ApiResponse<Void>> build(HttpStatus status, String message, List<ApiError> errors) {
        return ResponseEntity.status(status)
                .body(ApiResponse.failure(status.value(), message, errors));
    }
}
