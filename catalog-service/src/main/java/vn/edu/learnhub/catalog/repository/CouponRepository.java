// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/repository/CouponRepository.java
// purpose: truy van ma giam gia.

package vn.edu.learnhub.catalog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.catalog.entity.Coupon;

import java.util.List;
import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    Optional<Coupon> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<Coupon> findByOwnerTypeAndOwnerIdOrderByCreatedAtDesc(String ownerType, Long ownerId);

    List<Coupon> findByOwnerTypeOrderByCreatedAtDesc(String ownerType);
}
