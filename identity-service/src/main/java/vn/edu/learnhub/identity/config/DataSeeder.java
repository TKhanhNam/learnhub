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

    public DataSeeder(AppUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }

        create("admin", "admin@learnhub.vn", "Quan tri LearnHub", "admin123", Roles.ADMIN, null);
        create("teacher1", "teacher1@learnhub.vn", "Nguyen Van Giang", "teacher123", Roles.INSTRUCTOR,
                "Giang vien Java & Spring Boot");
        create("teacher2", "teacher2@learnhub.vn", "Tran Thi Thiet Ke", "teacher123", Roles.INSTRUCTOR,
                "Giang vien UI/UX va Figma");
        create("student1", "student1@learnhub.vn", "Le Van Hoc", "student123", Roles.STUDENT, null);
        create("student2", "student2@learnhub.vn", "Pham Thi Sinh Vien", "student123", Roles.STUDENT, null);
        create("orgadmin", "hr@fpt-demo.vn", "Quan tri FPT Demo", "org12345", Roles.ORG_ADMIN,
                "Phu trach L&D cua doanh nghiep");

        log.info("Da tao 6 tai khoan demo cho identity_db");
    }

    private void create(String username, String email, String fullName,
                        String rawPassword, String role, String headline) {
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setHeadline(headline);
        user.setCreatedAt(Instant.now());
        userRepository.save(user);
    }
}
