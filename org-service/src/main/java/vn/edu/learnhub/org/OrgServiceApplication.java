package vn.edu.learnhub.org;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"vn.edu.learnhub.org", "vn.edu.learnhub.platform"})
public class OrgServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrgServiceApplication.class, args);
    }
}
