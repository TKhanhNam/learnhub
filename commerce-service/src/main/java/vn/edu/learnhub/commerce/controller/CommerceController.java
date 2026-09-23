package vn.edu.learnhub.commerce.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.commerce.dto.CommerceDtos;
import vn.edu.learnhub.commerce.service.CommerceService;
import vn.edu.learnhub.platform.api.ApiResponse;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.util.List;

@RestController
@RequestMapping("/commerce")
public class CommerceController {

    private final CommerceService commerceService;

    public CommerceController(CommerceService commerceService) {
        this.commerceService = commerceService;
    }

    @GetMapping("/cart")
    public ApiResponse<CommerceDtos.CartDTO> cart() {
        return ApiResponse.ok(commerceService.getCart(CurrentUser.requireId()));
    }

    @PostMapping("/cart")
    public ApiResponse<CommerceDtos.CartDTO> add(@Valid @RequestBody CommerceDtos.AddCartRequest request) {
        return ApiResponse.ok(commerceService.addToCart(CurrentUser.requireId(), request.courseId()),
                "Da them vao gio");
    }

    @DeleteMapping("/cart/{courseId}")
    public ApiResponse<CommerceDtos.CartDTO> remove(@PathVariable Long courseId) {
        return ApiResponse.ok(commerceService.removeFromCart(CurrentUser.requireId(), courseId),
                "Da xoa khoi gio");
    }

    @PostMapping("/checkout")
    public ApiResponse<CommerceDtos.OrderDTO> checkout(@RequestBody(required = false) CommerceDtos.CheckoutRequest request) {
        return ApiResponse.created(commerceService.checkout(CurrentUser.requireId(),
                        request == null ? new CommerceDtos.CheckoutRequest(null, false, null, null) : request),
                "Thanh toan mock thanh cong, da cap quyen hoc tron doi");
    }

    @GetMapping("/orders")
    public ApiResponse<List<CommerceDtos.OrderDTO>> myOrders(@PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.page(commerceService.myOrders(CurrentUser.requireId(), pageable));
    }

    @GetMapping("/instructor/payouts")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<CommerceDtos.InstructorPayoutDTO> payouts() {
        return ApiResponse.ok(commerceService.instructorPayout(CurrentUser.requireId()));
    }

    @GetMapping("/admin/orders")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<CommerceDtos.OrderDTO>> adminOrders(@PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.page(commerceService.adminOrders(pageable));
    }

    @GetMapping("/admin/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CommerceDtos.AnalyticsDTO> adminAnalytics() {
        return ApiResponse.ok(commerceService.adminAnalytics());
    }

    @GetMapping("/admin/export")
    @PreAuthorize("hasRole('ADMIN')")
    public org.springframework.http.ResponseEntity<byte[]> exportRevenue() {
        byte[] bytes = commerceService.exportExcel();
        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=learnhub-doanh-thu.xlsx")
                .contentType(org.springframework.http.MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }
}
