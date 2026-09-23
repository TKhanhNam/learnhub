// path: learning-service/src/main/java/vn/edu/learnhub/learning/controller/LearningController.java
// purpose: API hoc vien: khoa hoc cua toi, tien do, ghi chu, quiz, bai tap, chung chi.

package vn.edu.learnhub.learning.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.learning.dto.LearningDtos;
import vn.edu.learnhub.learning.service.AssessmentService;
import vn.edu.learnhub.learning.service.CertificateService;
import vn.edu.learnhub.learning.service.EnrollmentService;
import vn.edu.learnhub.platform.api.ApiResponse;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/learning")
public class LearningController {

    private final EnrollmentService enrollmentService;
    private final AssessmentService assessmentService;
    private final CertificateService certificateService;

    public LearningController(EnrollmentService enrollmentService,
                              AssessmentService assessmentService,
                              CertificateService certificateService) {
        this.enrollmentService = enrollmentService;
        this.assessmentService = assessmentService;
        this.certificateService = certificateService;
    }

    @GetMapping("/my-courses")
    public ApiResponse<List<LearningDtos.EnrolledCourseDTO>> myCourses(
            @PageableDefault(size = 12) Pageable pageable) {
        return ApiResponse.page(enrollmentService.myCourses(CurrentUser.requireId(), pageable));
    }

    @GetMapping("/access/{courseId}")
    public ApiResponse<LearningDtos.AccessDTO> access(@PathVariable Long courseId) {
        return ApiResponse.ok(enrollmentService.checkAccess(CurrentUser.requireId(), courseId));
    }

    @GetMapping("/progress/{courseId}")
    public ApiResponse<LearningDtos.ProgressDTO> progress(@PathVariable Long courseId) {
        return ApiResponse.ok(enrollmentService.getProgress(CurrentUser.requireId(), courseId));
    }

    @PutMapping("/progress")
    public ApiResponse<LearningDtos.ProgressDTO> updateProgress(
            @Valid @RequestBody LearningDtos.ProgressUpdateRequest request) {
        return ApiResponse.ok(enrollmentService.updateProgress(CurrentUser.requireId(), request),
                "Da cap nhat tien do");
    }

    @GetMapping("/notes")
    public ApiResponse<List<LearningDtos.NoteDTO>> notes(@RequestParam Long courseId) {
        return ApiResponse.ok(enrollmentService.getNotes(CurrentUser.requireId(), courseId));
    }

    @PostMapping("/notes")
    public ApiResponse<LearningDtos.NoteDTO> addNote(@Valid @RequestBody LearningDtos.NoteRequest request) {
        return ApiResponse.created(enrollmentService.addNote(CurrentUser.requireId(), request), "Da luu ghi chu");
    }

    @DeleteMapping("/notes/{id}")
    public ApiResponse<Void> deleteNote(@PathVariable Long id) {
        enrollmentService.deleteNote(CurrentUser.requireId(), id);
        return ApiResponse.ok(null, "Da xoa ghi chu");
    }

    @PostMapping("/quizzes/{quizId}/attempts")
    public ApiResponse<LearningDtos.QuizResultDTO> submitQuiz(
            @PathVariable Long quizId, @Valid @RequestBody LearningDtos.QuizSubmitRequest request) {
        return ApiResponse.ok(assessmentService.submitQuiz(CurrentUser.requireId(), quizId, request),
                "Da nop bai quiz");
    }

    @GetMapping("/quizzes/attempts")
    public ApiResponse<List<LearningDtos.QuizResultDTO>> quizAttempts(@RequestParam Long courseId) {
        return ApiResponse.ok(assessmentService.myQuizAttempts(CurrentUser.requireId(), courseId));
    }

    @PostMapping("/assignments/{assignmentId}/submissions")
    public ApiResponse<LearningDtos.SubmissionDTO> submitAssignment(
            @PathVariable Long assignmentId,
            @Valid @RequestBody LearningDtos.AssignmentSubmitRequest request) {
        return ApiResponse.created(
                assessmentService.submitAssignment(CurrentUser.requireId(), assignmentId, request),
                "Da nop link bai tap");
    }

    @GetMapping("/assignments/submissions")
    public ApiResponse<List<LearningDtos.SubmissionDTO>> mySubmissions(@RequestParam Long courseId) {
        return ApiResponse.ok(assessmentService.mySubmissions(CurrentUser.requireId(), courseId));
    }

    @GetMapping("/instructor/submissions")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<List<LearningDtos.SubmissionDTO>> instructorSubmissions(@RequestParam Long courseId) {
        return ApiResponse.ok(assessmentService.instructorSubmissions(courseId));
    }

    @PostMapping("/instructor/submissions/{id}/grade")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<LearningDtos.SubmissionDTO> grade(
            @PathVariable Long id, @Valid @RequestBody LearningDtos.GradeRequest request) {
        return ApiResponse.ok(assessmentService.grade(id, request), "Da cham diem");
    }

    @PostMapping("/certificates/{courseId}")
    public ResponseEntity<ApiResponse<LearningDtos.CertificateDTO>> issue(@PathVariable Long courseId) {
        LearningDtos.CertificateDTO dto = certificateService.issue(CurrentUser.requireId(), courseId);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.accepted(dto, "Dang xuat PDF chung chi, vui long doi vai giay"));
    }

    @GetMapping("/certificates")
    public ApiResponse<List<LearningDtos.CertificateDTO>> myCertificates() {
        return ApiResponse.ok(certificateService.myCertificates(CurrentUser.requireId()));
    }

    @GetMapping("/instructor/stats")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<LearningDtos.InstructorStatsDTO> instructorStats(@RequestParam List<Long> courseIds) {
        return ApiResponse.ok(enrollmentService.statsForCourses(courseIds));
    }
}
