package vn.edu.learnhub.social;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"vn.edu.learnhub.social", "vn.edu.learnhub.platform"})
public class SocialServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SocialServiceApplication.class, args);
    }
}
