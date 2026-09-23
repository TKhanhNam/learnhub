// path: platform-common/src/main/java/vn/edu/learnhub/platform/async/AsyncConfig.java
// purpose: Async Offloading (file cong nghe loi muc 2): viec ton thoi gian (gui email,
// xuat PDF chung chi, xu ly video) khong lam nguoi dung phai cho -> API tra 202 Accepted ngay,
// worker chay ngam. Ban nay dung thread pool noi bo; production doi sang RabbitMQ (xem README).

package vn.edu.learnhub.platform.async;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "backgroundExecutor")
    public TaskExecutor backgroundExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("learnhub-job-");
        executor.initialize();
        return executor;
    }
}
