package vn.edu.learnhub.commerce.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.commerce.entity.OrderItem;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrderId(Long orderId);
    List<OrderItem> findByInstructorId(Long instructorId);
}
