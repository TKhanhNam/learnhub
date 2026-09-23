package vn.edu.learnhub.assist;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"vn.edu.learnhub.assist", "vn.edu.learnhub.platform"})
public class AssistServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AssistServiceApplication.class, args);
    }
}
