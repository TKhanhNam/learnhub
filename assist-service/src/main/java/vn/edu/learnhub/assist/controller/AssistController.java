package vn.edu.learnhub.assist.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.learnhub.assist.dto.AssistDtos;
import vn.edu.learnhub.assist.service.AssistService;
import vn.edu.learnhub.platform.api.ApiResponse;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/assist")
public class AssistController {
    private final AssistService assistService;

    public AssistController(AssistService assistService) {
        this.assistService = assistService;
    }

    @GetMapping("/help")
    public ApiResponse<List<AssistDtos.HelpDTO>> help(@RequestParam(defaultValue = "vi") String locale) {
        return ApiResponse.ok(assistService.help(locale));
    }

    @GetMapping("/ai-fee")
    public ApiResponse<AssistDtos.FeeDTO> fee() {
        return ApiResponse.ok(assistService.fee());
    }

    @PatchMapping("/admin/ai-fee")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AssistDtos.FeeDTO> updateFee(@Valid @RequestBody AssistDtos.FeeUpdateRequest request) {
        return ApiResponse.ok(assistService.updateFee(request.extraPercent()), "Da cap nhat phi AI");
    }

    @PostMapping("/chat")
    public ApiResponse<AssistDtos.ChatDTO> chat(@Valid @RequestBody AssistDtos.ChatRequest request) {
        return ApiResponse.ok(assistService.chat(CurrentUser.requireId(), request), "Tra loi tu tro ly demo");
    }
}
