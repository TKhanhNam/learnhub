// path: learning-service/src/main/java/vn/edu/learnhub/learning/controller/InternalLearningController.java
// purpose: API noi bo: commerce cap/thu hoi quyen; content kiem tra so huu truoc khi phat video.

package vn.edu.learnhub.learning.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.learning.dto.LearningDtos;
import vn.edu.learnhub.learning.service.EnrollmentService;

import java.util.List;

@RestController
@RequestMapping("/internal")
public class InternalLearningController {

    private final EnrollmentService enrollmentService;

    public InternalLearningController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @PostMapping("/enrollments/grant")
    public LearningDtos.GrantResultDTO grant(@Valid @RequestBody LearningDtos.GrantRequest request) {
        return enrollmentService.grant(request);
    }

    @PostMapping("/enrollments/revoke")
    public void revoke(@RequestParam Long userId, @RequestParam Long courseId) {
        enrollmentService.revoke(userId, courseId);
    }

    @GetMapping("/enrollments/access")
    public LearningDtos.AccessDTO access(@RequestParam Long userId, @RequestParam Long courseId) {
        return enrollmentService.checkAccess(userId, courseId);
    }

    @GetMapping("/stats/courses")
    public LearningDtos.InstructorStatsDTO stats(@RequestParam List<Long> courseIds) {
        return enrollmentService.statsForCourses(courseIds);
    }

    @GetMapping("/stats/course/{courseId}/count")
    public long count(@PathVariable Long courseId) {
        return enrollmentService.countByCourse(courseId);
    }
}
