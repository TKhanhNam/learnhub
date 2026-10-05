package vn.edu.learnhub.payment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.payment.entity.PaymentTransaction;

import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByGatewayAndGatewayOrderId(String gateway, String gatewayOrderId);
}
