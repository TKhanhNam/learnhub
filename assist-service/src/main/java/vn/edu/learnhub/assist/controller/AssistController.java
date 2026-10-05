package vn.edu.learnhub.assist.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import vn.edu.learnhub.assist.dto.AssistDtos;
import vn.edu.learnhub.assist.service.AssistService;
import vn.edu.learnhub.platform.api.ApiResponse;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.AuthUser;
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

    @PostMapping("/guest-chat")
    public ApiResponse<AssistDtos.ChatDTO> guestChat(@Valid @RequestBody AssistDtos.ChatRequest request) {
        return ApiResponse.ok(assistService.guestChat(request));
    }

    @PostMapping("/chat")
    public ApiResponse<AssistDtos.ChatDTO> chat(@Valid @RequestBody AssistDtos.ChatRequest request) {
        return ApiResponse.ok(assistService.chat(CurrentUser.require(), request));
    }

    @PostMapping("/admin/chat")
    public ApiResponse<AssistDtos.ChatDTO> adminChat(@Valid @RequestBody AssistDtos.ChatRequest request) {
        AuthUser user = CurrentUser.require();
        if (!user.isAdmin()) {
            throw BusinessException.forbidden("Chi tai khoan admin moi xem bao cao");
        }
        return ApiResponse.ok(assistService.adminChat(user, request));
    }
}
