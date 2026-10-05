package vn.edu.learnhub.catalog.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.learnhub.catalog.dto.CatalogDtos;
import vn.edu.learnhub.catalog.entity.Coupon;
import vn.edu.learnhub.catalog.repository.CouponRepository;
import vn.edu.learnhub.catalog.repository.CourseRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit test kiem tra ma giam gia.
 * Sinh vien: Tran Thanh Binh (binh.pl.5b@gmail.com)
 */
@ExtendWith(MockitoExtension.class)
class CouponServiceTest {

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private CourseRepository courseRepository;

    private CouponService couponService;

    @BeforeEach
    void setUp() {
        couponService = new CouponService(couponRepository, courseRepository);
    }

    @Test
    @DisplayName("Khong nhap ma thi khong hop le")
    void checkRejectsBlankCode() {
        CatalogDtos.CouponCheckResponse response = couponService.check("  ", 1L);

        assertFalse(response.valid());
        assertEquals("Chua nhap ma giam gia", response.message());
    }

    @Test
    @DisplayName("Ma khong ton tai")
    void checkRejectsUnknownCode() {
        when(couponRepository.findByCodeIgnoreCase(anyString())).thenReturn(Optional.empty());

        CatalogDtos.CouponCheckResponse response = couponService.check("SALE10", 1L);

        assertFalse(response.valid());
        assertEquals("Ma giam gia khong ton tai", response.message());
    }

    @Test
    @DisplayName("Ma gan khoa khac thi khong ap dung")
    void checkRejectsCourseMismatch() {
        Coupon coupon = usableCoupon();
        coupon.setCourseId(99L);
        when(couponRepository.findByCodeIgnoreCase("SALE10")).thenReturn(Optional.of(coupon));

        CatalogDtos.CouponCheckResponse response = couponService.check("sale10", 1L);

        assertFalse(response.valid());
        assertEquals("Ma giam gia khong ap dung cho khoa hoc nay", response.message());
    }

    @Test
    @DisplayName("Ma hop le duoc chuan hoa chu hoa va trim")
    void checkAcceptsNormalizedCode() {
        Coupon coupon = usableCoupon();
        coupon.setCourseId(1L);
        coupon.setDiscountPercent(20);
        when(couponRepository.findByCodeIgnoreCase("SALE10")).thenReturn(Optional.of(coupon));

        CatalogDtos.CouponCheckResponse response = couponService.check("  sale10  ", 1L);

        assertTrue(response.valid());
        assertEquals(20, response.discountPercent());
    }

    private static Coupon usableCoupon() {
        Coupon coupon = new Coupon();
        coupon.setCode("SALE10");
        coupon.setActive(true);
        coupon.setMaxUses(10);
        coupon.setUsedCount(0);
        coupon.setValidFrom(Instant.now().minus(1, ChronoUnit.DAYS));
        coupon.setValidTo(Instant.now().plus(7, ChronoUnit.DAYS));
        return coupon;
    }
}
