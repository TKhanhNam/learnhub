// path: identity-service/src/main/java/vn/edu/learnhub/identity/repository/RefreshTokenRepository.java
// purpose: truy van refresh_token phuc vu xoay vong va thu hoi token.

package vn.edu.learnhub.identity.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.learnhub.identity.entity.RefreshToken;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByJti(String jti);

    @Modifying
    @Query("update RefreshToken t set t.revoked = true where t.userId = :userId and t.revoked = false")
    int revokeAllByUserId(@Param("userId") Long userId);
}
