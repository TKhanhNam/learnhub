// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/service/CouponService.java
// purpose: ma giam gia cua giang vien va cua san.
// Viec kiem tra + tru luot dung do commerce-service goi sang qua API noi bo khi thanh toan.

package vn.edu.learnhub.catalog.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.catalog.dto.CatalogDtos;
import vn.edu.learnhub.catalog.entity.Coupon;
import vn.edu.learnhub.catalog.entity.Course;
import vn.edu.learnhub.catalog.repository.CouponRepository;
import vn.edu.learnhub.catalog.repository.CourseRepository;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.AuthUser;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class CouponService {

    private final CouponRepository couponRepository;
    private final CourseRepository courseRepository;

    public CouponService(CouponRepository couponRepository, CourseRepository courseRepository) {
        this.couponRepository = couponRepository;
        this.courseRepository = courseRepository;
    }

    @Transactional
    public CatalogDtos.CouponDTO create(CatalogDtos.CouponRequest request) {
        AuthUser authUser = CurrentUser.require();
        String code = request.code().trim().toUpperCase();

        if (couponRepository.existsByCodeIgnoreCase(code)) {
            throw BusinessException.conflict("Ma giam gia da ton tai");
        }

        boolean platformCoupon = authUser.isAdmin();
        if (!platformCoupon) {
            // Giang vien bat buoc phai gan ma vao 1 khoa hoc CUA MINH
            if (request.courseId() == null) {
                throw BusinessException.badRequest("Giang vien phai chon khoa hoc cho ma giam gia");
            }
            Course course = courseRepository.findById(request.courseId())
                    .orElseThrow(() -> BusinessException.notFound("Khong tim thay khoa hoc"));
            CurrentUser.requireOwnerOrAdmin(course.getInstructorId(),
                    "Ban chi duoc tao ma giam gia cho khoa hoc cua minh");
        }

        Coupon coupon = new Coupon();
        coupon.setCode(code);
        coupon.setCourseId(request.courseId());
        coupon.setOwnerType(platformCoupon ? Coupon.OWNER_PLATFORM : Coupon.OWNER_INSTRUCTOR);
        coupon.setOwnerId(platformCoupon ? null : authUser.userId());
        coupon.setDiscountPercent(request.discountPercent());
        coupon.setMaxUses(request.maxUses() == null ? 100 : request.maxUses());
        coupon.setValidFrom(Instant.now());
        coupon.setValidTo(request.validTo() == null
                ? Instant.now().plus(30, ChronoUnit.DAYS)
                : request.validTo());

        return toDto(couponRepository.save(coupon));
    }

    public List<CatalogDtos.CouponDTO> listMine() {
        AuthUser authUser = CurrentUser.require();
        List<Coupon> coupons = authUser.isAdmin()
                ? couponRepository.findByOwnerTypeOrderByCreatedAtDesc(Coupon.OWNER_PLATFORM)
                : couponRepository.findByOwnerTypeAndOwnerIdOrderByCreatedAtDesc(
                Coupon.OWNER_INSTRUCTOR, authUser.userId());
        return coupons.stream().map(this::toDto).toList();
    }

    @Transactional
    public void deactivate(Long id) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay ma giam gia"));

        if (Coupon.OWNER_INSTRUCTOR.equals(coupon.getOwnerType())) {
            CurrentUser.requireOwnerOrAdmin(coupon.getOwnerId(), "Ban chi duoc xoa ma cua minh");
        } else if (!CurrentUser.require().isAdmin()) {
            throw BusinessException.forbidden("Chi admin duoc xoa ma cua san");
        }

        coupon.setActive(false);
        couponRepository.save(coupon);
    }

    /** commerce-service goi sang de kiem tra ma truoc khi tinh tien. */
    public CatalogDtos.CouponCheckResponse check(String code, Long courseId) {
        if (code == null || code.isBlank()) {
            return new CatalogDtos.CouponCheckResponse(false, null, 0, "Chua nhap ma giam gia");
        }

        Coupon coupon = couponRepository.findByCodeIgnoreCase(code.trim()).orElse(null);
        if (coupon == null) {
            return new CatalogDtos.CouponCheckResponse(false, null, 0, "Ma giam gia khong ton tai");
        }
        if (!coupon.isUsable(Instant.now())) {
            return new CatalogDtos.CouponCheckResponse(false, null, 0,
                    "Ma giam gia da het han hoac het luot su dung");
        }
        if (coupon.getCourseId() != null && !coupon.getCourseId().equals(courseId)) {
            return new CatalogDtos.CouponCheckResponse(false, null, 0,
                    "Ma giam gia khong ap dung cho khoa hoc nay");
        }
        return new CatalogDtos.CouponCheckResponse(true, coupon.getId(), coupon.getDiscountPercent(),
                "Ap dung ma giam gia thanh cong");
    }

    /**
     * Tru 1 luot dung khi don hang thanh toan xong.
     * @Transactional de tranh 2 don cung tru 1 luot cuoi cung (race condition) - giong Buoi 3.
     */
    @Transactional
    public void redeem(Long couponId) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay ma giam gia"));

        if (!coupon.isUsable(Instant.now())) {
            throw BusinessException.conflict("Ma giam gia da het luot su dung");
        }
        coupon.setUsedCount(coupon.getUsedCount() + 1);
        couponRepository.save(coupon);
    }

    /** Hoan lai luot dung khi Saga thanh toan that bai (buoc compensate). */
    @Transactional
    public void release(Long couponId) {
        couponRepository.findById(couponId).ifPresent(coupon -> {
            if (coupon.getUsedCount() > 0) {
                coupon.setUsedCount(coupon.getUsedCount() - 1);
                couponRepository.save(coupon);
            }
        });
    }

    private CatalogDtos.CouponDTO toDto(Coupon coupon) {
        return new CatalogDtos.CouponDTO(coupon.getId(), coupon.getCode(), coupon.getCourseId(),
                coupon.getOwnerType(), coupon.getOwnerId(), coupon.getDiscountPercent(),
                coupon.getMaxUses(), coupon.getUsedCount(), coupon.getValidFrom(),
                coupon.getValidTo(), coupon.isActive());
    }
}
