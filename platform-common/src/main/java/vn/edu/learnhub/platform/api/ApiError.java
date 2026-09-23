// path: platform-common/src/main/java/vn/edu/learnhub/platform/api/ApiError.java
// purpose: 1 dong loi trong envelope. field = null neu la loi nghiep vu chung,
// field = "tenTruong" neu la loi validate du lieu dau vao.

package vn.edu.learnhub.platform.api;

public record ApiError(String field, String message) {

    public static ApiError of(String message) {
        return new ApiError(null, message);
    }
}
