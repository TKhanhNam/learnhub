package vn.edu.learnhub.commerce;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"vn.edu.learnhub.commerce", "vn.edu.learnhub.platform"})
public class CommerceServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CommerceServiceApplication.class, args);
    }
}
