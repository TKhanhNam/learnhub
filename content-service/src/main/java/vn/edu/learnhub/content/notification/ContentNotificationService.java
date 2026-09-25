package vn.edu.learnhub.content.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Dịch vụ Phát thông báo (Notification Service) của phân hệ Content
 * Sinh viên thực hiện: Lâm Thu Thùy (thuy1411 - 2311060387@hunre.edu.vn)
 */
@Service
public class ContentNotificationService {

    private static final Logger log = LoggerFactory.getLogger(ContentNotificationService.class);

    public record NotificationItem(
            String id,
            Long courseId,
            String title,
            String message,
            String eventType,
            Instant createdAt
    ) {}

    private final ConcurrentLinkedQueue<NotificationItem> recentNotifications = new ConcurrentLinkedQueue<>();

    public void notifyNewLecture(Long courseId, String lectureTitle, String type) {
        String message = String.format("Giảng viên vừa thêm bài giảng mới [%s]: %s", type, lectureTitle);
        publishNotification(courseId, "Bài giảng mới", message, "NEW_LECTURE");
    }

    public void notifyNewQuiz(Long courseId, String quizTitle) {
        String message = String.format("Giảng viên vừa cập nhật bài trắc nghiệm / quiz: %s", quizTitle);
        publishNotification(courseId, "Bài kiểm tra mới", message, "NEW_QUIZ");
    }

    public void notifyNewAssignment(Long courseId, String assignmentTitle) {
        String message = String.format("Giảng viên vừa giao bài tập thực hành: %s", assignmentTitle);
        publishNotification(courseId, "Bài tập mới", message, "NEW_ASSIGNMENT");
    }

    private void publishNotification(Long courseId, String title, String message, String eventType) {
        String id = "notif-" + System.currentTimeMillis();
        NotificationItem item = new NotificationItem(id, courseId, title, message, eventType, Instant.now());
        recentNotifications.add(item);
        if (recentNotifications.size() > 50) {
            recentNotifications.poll();
        }
        log.info("[NotificationService] Phat thong bao thanh cong cho khoa hoc #{}: {} - {}", courseId, title, message);
    }

    public ConcurrentLinkedQueue<NotificationItem> getRecentNotifications() {
        return recentNotifications;
    }
}
