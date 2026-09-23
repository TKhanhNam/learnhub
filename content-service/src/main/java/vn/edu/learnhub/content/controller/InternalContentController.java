package vn.edu.learnhub.content.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.learnhub.content.dto.ContentDtos;
import vn.edu.learnhub.content.service.ContentService;

@RestController
@RequestMapping("/internal")
public class InternalContentController {
    private final ContentService contentService;

    public InternalContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/courses/{courseId}/stats")
    public ContentDtos.CourseContentStats stats(@PathVariable Long courseId) {
        return contentService.stats(courseId);
    }

    @GetMapping("/quizzes/{quizId}/answer-key")
    public ContentDtos.QuizAnswerKey answerKey(@PathVariable Long quizId) {
        return contentService.answerKey(quizId);
    }
}
