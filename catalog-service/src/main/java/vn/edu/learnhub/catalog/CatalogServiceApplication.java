// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/CatalogServiceApplication.java
// purpose: khoi dong catalog-service (cong 8082, DB catalog_db).

package vn.edu.learnhub.catalog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"vn.edu.learnhub.catalog", "vn.edu.learnhub.platform"})
public class CatalogServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CatalogServiceApplication.class, args);
    }
}
