// path: identity-service/src/main/java/vn/edu/learnhub/identity/service/Roles.java
// purpose: 4 vai tro cua he thong LearnHub.

package vn.edu.learnhub.identity.service;

import java.util.Set;

public final class Roles {

    public static final String STUDENT = "STUDENT";
    public static final String INSTRUCTOR = "INSTRUCTOR";
    public static final String ADMIN = "ADMIN";
    public static final String ORG_ADMIN = "ORG_ADMIN";

    /** Nguoi dung tu dang ky chi duoc chon 2 vai tro nay. */
    public static final Set<String> SELF_SIGNUP = Set.of(STUDENT, INSTRUCTOR);

    public static final Set<String> ALL = Set.of(STUDENT, INSTRUCTOR, ADMIN, ORG_ADMIN);

    private Roles() {
    }
}
