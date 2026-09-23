// path: platform-common/src/main/java/vn/edu/learnhub/platform/security/AuthUser.java
// purpose: thong tin nguoi dung lay tu JWT, duoc gan vao SecurityContext.
// Buoi 9 dung tam getCredentials() de chua userId; o day tach han 1 record rieng cho ro rang.

package vn.edu.learnhub.platform.security;

public record AuthUser(Long userId, String username, String role) {

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }

    public boolean isInstructor() {
        return "INSTRUCTOR".equals(role);
    }
}
