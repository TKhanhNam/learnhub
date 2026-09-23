package vn.edu.learnhub.commerce.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.commerce.entity.CartItem;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<CartItem> findByUserIdAndCourseId(Long userId, Long courseId);
    void deleteByUserId(Long userId);
    boolean existsByUserIdAndCourseId(Long userId, Long courseId);
}
