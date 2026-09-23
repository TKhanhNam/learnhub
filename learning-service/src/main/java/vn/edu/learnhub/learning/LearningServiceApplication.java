// path: learning-service/src/main/java/vn/edu/learnhub/learning/LearningServiceApplication.java
// purpose: khoi dong learning-service (cong 8083, DB learning_db).

package vn.edu.learnhub.learning;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"vn.edu.learnhub.learning", "vn.edu.learnhub.platform"})
public class LearningServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(LearningServiceApplication.class, args);
    }
}
