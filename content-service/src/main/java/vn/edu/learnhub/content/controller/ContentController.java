// Thùy: API bài giảng / quiz / bài tập trong content-service
package vn.edu.learnhub.content.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.learnhub.content.dto.ContentDtos;
import vn.edu.learnhub.content.service.ContentService;
import vn.edu.learnhub.platform.api.ApiResponse;

@RestController
@RequestMapping("/content")
public class ContentController {
    private final ContentService contentService;
    private final vn.edu.learnhub.content.service.MinioStorageService minioStorageService;
    private final vn.edu.learnhub.content.notification.ContentNotificationService notificationService;

    public ContentController(ContentService contentService,
                             vn.edu.learnhub.content.service.MinioStorageService minioStorageService,
                             vn.edu.learnhub.content.notification.ContentNotificationService notificationService) {
        this.contentService = contentService;
        this.minioStorageService = minioStorageService;
        this.notificationService = notificationService;
    }

    @GetMapping("/courses/{courseId}/curriculum")
    public ApiResponse<ContentDtos.CurriculumDTO> curriculum(@PathVariable Long courseId) {
        return ApiResponse.ok(contentService.getCurriculum(courseId));
    }

    @PostMapping("/courses/{courseId}/lectures")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<ContentDtos.LectureDTO> addLecture(@PathVariable Long courseId,
                                                          @Valid @RequestBody ContentDtos.LectureRequest req) {
        return ApiResponse.created(contentService.addLecture(courseId, req), "Da them bai giang");
    }

    @PutMapping("/lectures/{id}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<ContentDtos.LectureDTO> updateLecture(@PathVariable Long id,
                                                             @Valid @RequestBody ContentDtos.LectureRequest req) {
        return ApiResponse.ok(contentService.updateLecture(id, req), "Da cap nhat bai giang");
    }

    @DeleteMapping("/lectures/{id}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<Void> deleteLecture(@PathVariable Long id) {
        contentService.deleteLecture(id);
        return ApiResponse.ok(null, "Da xoa bai giang");
    }

    @PostMapping("/courses/{courseId}/quizzes")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<ContentDtos.QuizDTO> addQuiz(@PathVariable Long courseId,
                                                    @Valid @RequestBody ContentDtos.QuizRequest req) {
        return ApiResponse.created(contentService.addQuiz(courseId, req), "Da tao quiz");
    }

    @PostMapping("/courses/{courseId}/assignments")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<ContentDtos.AssignmentDTO> addAssignment(@PathVariable Long courseId,
                                                                @Valid @RequestBody ContentDtos.AssignmentRequest req) {
        return ApiResponse.created(contentService.addAssignment(courseId, req), "Da tao bai tap");
    }

    @PostMapping(value = "/courses/{courseId}/lectures/upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<ContentDtos.UploadMediaResponse> uploadMedia(
            @PathVariable Long courseId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "type", defaultValue = "video") String type) {
        String objectName = minioStorageService.uploadFile(file, "courses/" + courseId + "/" + type);
        String url = minioStorageService.getPresignedUrl(objectName);
        return ApiResponse.ok(new ContentDtos.UploadMediaResponse(objectName, url), "Upload len MinIO thanh cong");
    }

    @GetMapping("/courses/{courseId}/notifications")
    public ApiResponse<java.util.List<vn.edu.learnhub.content.notification.ContentNotificationService.NotificationItem>> getNotifications(@PathVariable Long courseId) {
        return ApiResponse.ok(
                notificationService.getRecentNotifications().stream()
                        .filter(n -> n.courseId().equals(courseId))
                        .toList()
        );
    }
}
