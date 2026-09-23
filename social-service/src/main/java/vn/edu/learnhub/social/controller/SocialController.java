package vn.edu.learnhub.social.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import vn.edu.learnhub.platform.api.ApiResponse;
import vn.edu.learnhub.platform.security.CurrentUser;
import vn.edu.learnhub.social.dto.SocialDtos;
import vn.edu.learnhub.social.service.SocialService;

import java.util.List;

@RestController
@RequestMapping("/social")
public class SocialController {
    private final SocialService socialService;

    public SocialController(SocialService socialService) {
        this.socialService = socialService;
    }

    @GetMapping("/reviews")
    public ApiResponse<List<SocialDtos.ReviewDTO>> reviews(@RequestParam Long courseId) {
        return ApiResponse.ok(socialService.listReviews(courseId));
    }

    @PostMapping("/reviews")
    public ApiResponse<SocialDtos.ReviewDTO> addReview(@Valid @RequestBody SocialDtos.ReviewRequest request) {
        return ApiResponse.created(socialService.addReview(CurrentUser.requireId(), request), "Da gui danh gia");
    }

    @PostMapping("/reviews/{id}/reply")
    public ApiResponse<SocialDtos.ReviewDTO> replyReview(@PathVariable Long id,
                                                         @Valid @RequestBody SocialDtos.ReplyRequest request) {
        return ApiResponse.ok(socialService.replyReview(CurrentUser.requireId(), id, request.body()),
                "Da phan hoi danh gia");
    }

    @GetMapping("/questions")
    public ApiResponse<List<SocialDtos.QuestionDTO>> questions(@RequestParam Long courseId) {
        return ApiResponse.ok(socialService.listQuestions(courseId));
    }

    @PostMapping("/questions")
    public ApiResponse<SocialDtos.QuestionDTO> addQuestion(@Valid @RequestBody SocialDtos.QuestionRequest request) {
        return ApiResponse.created(socialService.addQuestion(CurrentUser.requireId(), request), "Da dang cau hoi");
    }

    @PostMapping("/questions/{id}/answers")
    public ApiResponse<SocialDtos.AnswerDTO> addAnswer(@PathVariable Long id,
                                                       @Valid @RequestBody SocialDtos.AnswerRequest request) {
        return ApiResponse.created(socialService.addAnswer(CurrentUser.requireId(), id, request), "Da tra loi");
    }
}
