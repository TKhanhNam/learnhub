// path: identity-service/src/main/java/vn/edu/learnhub/identity/config/DataSeeder.java
// purpose: tao san tai khoan demo cho 4 vai tro khi chay lan dau (mat khau bam BCrypt).
// Chi tao khi bang con trong, khong ghi de du lieu that.

package vn.edu.learnhub.identity.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.identity.entity.AppUser;
import vn.edu.learnhub.identity.repository.AppUserRepository;
import vn.edu.learnhub.identity.service.Roles;

import java.time.Instant;

@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${SEED_ADMIN_EMAIL:${seed.admin.email:}}")
    private String seedAdminEmail;

    @org.springframework.beans.factory.annotation.Value("${SEED_ADMIN_PASSWORD:${seed.admin.password:}}")
    private String seedAdminPassword;

    @org.springframework.beans.factory.annotation.Value("${SEED_ADMIN_NAME:${seed.admin.name:Shop Admin}}")
    private String seedAdminName;

    public DataSeeder(AppUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        int created = 0;
        created += ensure("admin", "admin@learnhub.vn", "Quan tri LearnHub", "admin123", Roles.ADMIN, null);
        created += ensure("tkhanhnam", "tkhanhnam@learnhub.vn", "Thieu Khanh Nam", "admin123", Roles.ADMIN, "Quan tri vien he thong");

        if (seedAdminEmail != null && !seedAdminEmail.isBlank() && seedAdminPassword != null && !seedAdminPassword.isBlank()) {
            String uName = seedAdminEmail.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "");
            created += ensure(uName.isBlank() ? "seedadmin" : uName, seedAdminEmail, seedAdminName, seedAdminPassword, Roles.ADMIN, "Admin duoc tao tu bien moi truong");
        }

        created += ensure("teacher1", "teacher1@learnhub.vn", "Nguyen Van Giang", "teacher123", Roles.INSTRUCTOR,
                "Giang vien Java & Spring Boot");
        created += ensure("teacher2", "teacher2@learnhub.vn", "Tran Thi Thiet Ke", "teacher123", Roles.INSTRUCTOR,
                "Giang vien UI/UX va Figma");
        created += ensure("student1", "student1@learnhub.vn", "Le Van Hoc", "student123", Roles.STUDENT, null);
        created += ensure("student2", "student2@learnhub.vn", "Pham Thi Sinh Vien", "student123", Roles.STUDENT, null);
        created += ensure("orgadmin", "hr@fpt-demo.vn", "Quan tri FPT Demo", "org12345", Roles.ORG_ADMIN,
                "Phu trach L&D cua doanh nghiep");
        if (created > 0) {
            log.info("Da tao {} tai khoan demo cho identity_db", created);
        }
    }

    private int ensure(String username, String email, String fullName,
                       String rawPassword, String role, String headline) {
        if (userRepository.existsByUsernameIgnoreCase(username) || userRepository.existsByEmailIgnoreCase(email)) {
            return 0;
        }
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setHeadline(headline);
        user.setCreatedAt(Instant.now());
        user.setEmailVerifiedAt(Instant.now());
        userRepository.save(user);
        return 1;
    }
}
