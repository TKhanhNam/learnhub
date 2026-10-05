package vn.edu.learnhub.commerce.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.commerce.dto.CommerceDtos;
import vn.edu.learnhub.commerce.service.CommerceService;
import vn.edu.learnhub.platform.api.ApiResponse;

@RestController
@RequestMapping("/internal/payments")
public class InternalPaymentController {
    private final CommerceService commerceService;

    public InternalPaymentController(CommerceService commerceService) {
        this.commerceService = commerceService;
    }

    @PostMapping("/momo-confirm")
    public ApiResponse<CommerceDtos.OrderDTO> confirm(@RequestBody CommerceDtos.MomoNotice notice) {
        return ApiResponse.ok(commerceService.confirmMomo(notice), "Da xac nhan thanh toan MoMo");
    }

    @PostMapping("/momo-fail")
    public ApiResponse<CommerceDtos.OrderDTO> fail(@RequestBody CommerceDtos.MomoNotice notice) {
        return ApiResponse.ok(commerceService.failMomo(notice), "Da ghi nhan giao dich that bai");
    }
}
