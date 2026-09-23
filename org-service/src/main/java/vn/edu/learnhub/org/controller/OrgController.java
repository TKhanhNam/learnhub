package vn.edu.learnhub.org.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.learnhub.org.dto.OrgDtos;
import vn.edu.learnhub.org.service.OrgService;
import vn.edu.learnhub.platform.api.ApiResponse;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/org")
public class OrgController {
    private final OrgService orgService;

    public OrgController(OrgService orgService) {
        this.orgService = orgService;
    }

    @GetMapping("/plans")
    public ApiResponse<List<OrgDtos.PlanDTO>> plans() {
        return ApiResponse.ok(orgService.plans());
    }

    @PostMapping("/demo-requests")
    public ApiResponse<OrgDtos.DemoDTO> demo(@Valid @RequestBody OrgDtos.DemoRequestBody request) {
        return ApiResponse.created(orgService.requestDemo(request), "Da nhan yeu cau dung thu");
    }

    @PostMapping("/organizations")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','ADMIN')")
    public ApiResponse<OrgDtos.OrgDTO> create(@Valid @RequestBody OrgDtos.CreateOrgRequest request) {
        return ApiResponse.created(orgService.createOrg(CurrentUser.requireId(), request), "Da tao to chuc");
    }

    @GetMapping("/organizations/me")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','ADMIN')")
    public ApiResponse<OrgDtos.OrgDTO> mine() {
        return ApiResponse.ok(orgService.myOrg(CurrentUser.requireId()));
    }

    @GetMapping("/organizations/{id}/members")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','ADMIN')")
    public ApiResponse<List<OrgDtos.MemberDTO>> members(@PathVariable Long id) {
        return ApiResponse.ok(orgService.members(id));
    }

    @PostMapping("/organizations/{id}/members")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','ADMIN')")
    public ApiResponse<OrgDtos.MemberDTO> addMember(@PathVariable Long id,
                                                    @Valid @RequestBody OrgDtos.MemberRequest request) {
        return ApiResponse.created(orgService.addMember(id, request), "Da them nhan su");
    }

    @GetMapping("/organizations/{id}/paths")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','ADMIN')")
    public ApiResponse<List<OrgDtos.PathDTO>> paths(@PathVariable Long id) {
        return ApiResponse.ok(orgService.paths(id));
    }

    @PostMapping("/organizations/{id}/paths")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','ADMIN')")
    public ApiResponse<OrgDtos.PathDTO> addPath(@PathVariable Long id,
                                                @Valid @RequestBody OrgDtos.PathRequest request) {
        return ApiResponse.created(orgService.addPath(id, request), "Da tao lo trinh");
    }

    @PostMapping("/organizations/{id}/assign")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','ADMIN')")
    public ApiResponse<Void> assign(@PathVariable Long id, @Valid @RequestBody OrgDtos.AssignRequest request) {
        orgService.assignCourse(id, request);
        return ApiResponse.ok(null, "Da cap khoa hoc cho nhan su");
    }

    @GetMapping("/organizations/{id}/report")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','ADMIN')")
    public ApiResponse<OrgDtos.ReportDTO> report(@PathVariable Long id) {
        return ApiResponse.ok(orgService.report(id));
    }

    @GetMapping("/admin/demo-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<OrgDtos.DemoDTO>> adminDemos() {
        return ApiResponse.ok(orgService.adminDemos());
    }
}
