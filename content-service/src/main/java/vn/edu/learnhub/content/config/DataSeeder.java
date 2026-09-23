package vn.edu.learnhub.content.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import vn.edu.learnhub.content.service.ContentService;

@Component
public class DataSeeder implements ApplicationRunner {
    private final ContentService contentService;
    public DataSeeder(ContentService contentService) { this.contentService = contentService; }
    @Override
    public void run(ApplicationArguments args) { contentService.seedIfEmpty(); }
}
