// path: platform-common/src/main/java/vn/edu/learnhub/platform/security/CurrentUser.java
// purpose: lay nguoi dung dang dang nhap tu SecurityContext.
// QUAN TRONG (Buoi 9): studentId/userId LUON lay tu token, KHONG lay tu body do client gui len,
// neu khong nguoi dung A co the gia mao nguoi dung B.

package vn.edu.learnhub.platform.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.edu.learnhub.platform.error.BusinessException;

public final class CurrentUser {

    private CurrentUser() {
    }

    public static AuthUser get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUser authUser)) {
            return null;
        }
        return authUser;
    }

    public static AuthUser require() {
        AuthUser authUser = get();
        if (authUser == null || authUser.userId() == null) {
            throw BusinessException.unauthorized("Ban can dang nhap de thuc hien chuc nang nay");
        }
        return authUser;
    }

    public static Long requireId() {
        return require().userId();
    }

    /**
     * ABAC (file cong nghe loi muc 3): chu so huu hoac ADMIN moi duoc sua.
     * Vi du: giang vien chi sua duoc khoa hoc CUA MINH.
     */
    public static void requireOwnerOrAdmin(Long ownerId, String message) {
        AuthUser authUser = require();
        if (authUser.isAdmin()) {
            return;
        }
        if (ownerId == null || !ownerId.equals(authUser.userId())) {
            throw BusinessException.forbidden(message);
        }
    }
}
