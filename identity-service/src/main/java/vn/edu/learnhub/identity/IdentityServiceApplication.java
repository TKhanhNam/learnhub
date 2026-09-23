// path: identity-service/src/main/java/vn/edu/learnhub/identity/IdentityServiceApplication.java
// purpose: khoi dong identity-service (cong 8081, DB identity_db).
// scanBasePackages co them "vn.edu.learnhub.platform" de nap envelope, JWT filter,
// GlobalExceptionHandler... tu module platform-common.

package vn.edu.learnhub.identity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"vn.edu.learnhub.identity", "vn.edu.learnhub.platform"})
public class IdentityServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(IdentityServiceApplication.class, args);
    }
}
