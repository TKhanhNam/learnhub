// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/controller/CatalogController.java
// purpose: API catalog cho Frontend qua Gateway (/api/catalog/**).
// GET la public (xem truoc khi mua), POST/PUT/DELETE yeu cau INSTRUCTOR hoac ADMIN.

package vn.edu.learnhub.catalog.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.catalog.dto.CatalogDtos;
import vn.edu.learnhub.catalog.service.CatalogService;
import vn.edu.learnhub.catalog.service.CouponService;
import vn.edu.learnhub.platform.api.ApiResponse;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/catalog")
public class CatalogController {

    private final CatalogService catalogService;
    private final CouponService couponService;

    public CatalogController(CatalogService catalogService, CouponService couponService) {
        this.catalogService = catalogService;
        this.couponService = couponService;
    }

    // ------------------------------------------------ public

    @GetMapping("/courses")
    public ApiResponse<List<CatalogDtos.CourseSummaryDTO>> searchCourses(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @PageableDefault(size = 48) Pageable pageable) {

        Page<CatalogDtos.CourseSummaryDTO> page = catalogService.searchPublished(
                keyword, category, level, language, minPrice, maxPrice, pageable);
        return ApiResponse.page(page);
    }

    @GetMapping("/courses/{slugOrId}")
    public ApiResponse<CatalogDtos.CourseDetailDTO> courseDetail(@PathVariable String slugOrId) {
        return ApiResponse.ok(catalogService.getPublicDetail(slugOrId));
    }

    @GetMapping("/categories")
    public ApiResponse<List<CatalogDtos.CategoryDTO>> categories() {
        return ApiResponse.ok(catalogService.getCategories());
    }

    @GetMapping("/trending-skills")
    public ApiResponse<List<CatalogDtos.TrendingSkillDTO>> trendingSkills(
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.ok(catalogService.getTrendingSkills(limit));
    }

    @GetMapping("/best-sellers")
    public ApiResponse<List<CatalogDtos.CourseSummaryDTO>> bestSellers(
            @RequestParam(defaultValue = "8") int limit) {
        return ApiResponse.ok(catalogService.getBestSellers(limit));
    }

    @GetMapping("/most-viewed")
    public ApiResponse<List<CatalogDtos.CourseSummaryDTO>> mostViewed(
            @RequestParam(defaultValue = "7") int limit) {
        return ApiResponse.ok(catalogService.getMostViewed(limit));
    }

    @PostMapping("/courses/{id}/view")
    public ApiResponse<Void> recordView(@PathVariable Long id) {
        catalogService.recordAccess(id);
        return ApiResponse.ok(null, "Da ghi nhan luot xem");
    }

    // ------------------------------------------------ giang vien

    @GetMapping("/instructor/courses")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<List<CatalogDtos.CourseSummaryDTO>> myCourses(
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.page(catalogService.getMyCourses(CurrentUser.requireId(), pageable));
    }

    @PostMapping("/courses")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<CatalogDtos.CourseDetailDTO> createCourse(
            @Valid @RequestBody CatalogDtos.CourseRequest request) {
        return ApiResponse.created(catalogService.create(request), "Da tao khoa hoc (trang thai nhap)");
    }

    @PutMapping("/courses/{id}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<CatalogDtos.CourseDetailDTO> updateCourse(
            @PathVariable Long id, @Valid @RequestBody CatalogDtos.CourseRequest request) {
        return ApiResponse.ok(catalogService.update(id, request), "Da cap nhat khoa hoc");
    }

    @DeleteMapping("/courses/{id}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<Void> deleteCourse(@PathVariable Long id) {
        catalogService.delete(id);
        return ApiResponse.ok(null, "Da xoa khoa hoc");
    }

    @PatchMapping("/courses/{id}/submit")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<CatalogDtos.CourseDetailDTO> submit(@PathVariable Long id) {
        return ApiResponse.ok(catalogService.submitForReview(id), "Da gui khoa hoc cho admin duyet");
    }

    // ------------------------------------------------ admin

    @GetMapping("/admin/courses")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<CatalogDtos.CourseSummaryDTO>> coursesByStatus(
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.page(catalogService.getByStatus(status, keyword, pageable));
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CatalogDtos.AdminStatsDTO> adminStats() {
        return ApiResponse.ok(catalogService.adminStats());
    }

    @GetMapping("/admin/export")
    @PreAuthorize("hasRole('ADMIN')")
    public org.springframework.http.ResponseEntity<byte[]> exportCourses() {
        byte[] bytes = catalogService.exportExcel();
        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=learnhub-khoa-hoc.xlsx")
                .contentType(org.springframework.http.MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @PatchMapping("/admin/courses/{id}/moderate")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CatalogDtos.CourseDetailDTO> moderate(
            @PathVariable Long id, @Valid @RequestBody CatalogDtos.ModerateRequest request) {
        return ApiResponse.ok(catalogService.moderate(id, request.action()), "Da cap nhat trang thai khoa hoc");
    }

    // ------------------------------------------------ coupon

    @GetMapping("/coupons")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<List<CatalogDtos.CouponDTO>> myCoupons() {
        return ApiResponse.ok(couponService.listMine());
    }

    @PostMapping("/coupons")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<CatalogDtos.CouponDTO> createCoupon(
            @Valid @RequestBody CatalogDtos.CouponRequest request) {
        return ApiResponse.created(couponService.create(request), "Da tao ma giam gia");
    }

    @DeleteMapping("/coupons/{id}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ApiResponse<Void> deleteCoupon(@PathVariable Long id) {
        couponService.deactivate(id);
        return ApiResponse.ok(null, "Da ngung ma giam gia");
    }

    /** Hoc vien nhap ma o trang gio hang de xem truoc so tien giam. */
    @GetMapping("/coupons/preview")
    public ApiResponse<CatalogDtos.CouponCheckResponse> previewCoupon(
            @RequestParam String code, @RequestParam Long courseId) {
        return ApiResponse.ok(couponService.check(code, courseId));
    }
}
