// path: identity-service/src/main/java/vn/edu/learnhub/identity/repository/AppUserRepository.java
// purpose: truy van bang app_user. Chi thao tac DB, khong chua logic nghiep vu (Buoi 2).

package vn.edu.learnhub.identity.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.identity.entity.AppUser;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsername(String username);

    Optional<AppUser> findByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    Page<AppUser> findByFullNameContainingIgnoreCaseOrUsernameContainingIgnoreCase(
            String fullName, String username, Pageable pageable);

    List<AppUser> findByIdIn(List<Long> ids);

    long countByRole(String role);

    long countByLocked(boolean locked);
}
