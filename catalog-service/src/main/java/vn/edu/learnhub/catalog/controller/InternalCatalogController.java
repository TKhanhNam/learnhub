// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/controller/InternalCatalogController.java
// purpose: API NOI BO chi cho service khac goi (Buoi 3):
// - commerce-service: doc gia/chu khoa hoc khi tao don, kiem tra + tru luot coupon
// - learning-service: doc thong tin khoa hoc de hien thi trang hoc
// - social-service: cap nhat diem danh gia trung binh

package vn.edu.learnhub.catalog.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.catalog.dto.CatalogDtos;
import vn.edu.learnhub.catalog.service.CatalogService;
import vn.edu.learnhub.catalog.service.CouponService;

import java.util.List;

@RestController
@RequestMapping("/internal")
public class InternalCatalogController {

    private final CatalogService catalogService;
    private final CouponService couponService;

    public InternalCatalogController(CatalogService catalogService, CouponService couponService) {
        this.catalogService = catalogService;
        this.couponService = couponService;
    }

    @GetMapping("/courses/{id}")
    public CatalogDtos.CourseSnapshotDTO snapshot(@PathVariable Long id) {
        return catalogService.getSnapshot(id);
    }

    @PostMapping("/courses/bulk")
    public List<CatalogDtos.CourseSnapshotDTO> snapshots(@RequestBody List<Long> ids) {
        return catalogService.getSnapshots(ids);
    }

    @PostMapping("/coupons/check")
    public CatalogDtos.CouponCheckResponse check(@RequestBody CatalogDtos.CouponCheckRequest request) {
        return couponService.check(request.code(), request.courseId());
    }

    @PostMapping("/coupons/{id}/redeem")
    public void redeem(@PathVariable Long id) {
        couponService.redeem(id);
    }

    /** Buoc compensate cua Saga khi thanh toan that bai. */
    @PostMapping("/coupons/{id}/release")
    public void release(@PathVariable Long id) {
        couponService.release(id);
    }

    @RequestMapping(path = "/courses/{id}/enrollment", method = {RequestMethod.PATCH, RequestMethod.POST})
    public void changeEnrollment(@PathVariable Long id, @RequestParam(defaultValue = "1") int delta) {
        catalogService.increaseEnrollment(id, delta);
    }

    @PatchMapping("/courses/{id}/rating")
    public void updateRating(@PathVariable Long id,
                             @RequestBody CatalogDtos.RatingUpdateRequest request) {
        catalogService.updateRating(id, request.ratingAvg(), request.ratingCount());
    }

    @GetMapping("/instructors/{instructorId}/course-count")
    public long courseCount(@PathVariable Long instructorId) {
        return catalogService.countByInstructor(instructorId);
    }

    @GetMapping("/stats/published-count")
    public long publishedCount() {
        return catalogService.countPublished();
    }
}
