package vn.edu.learnhub.org.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.org.entity.Organization;
import java.util.List;
import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
    List<Organization> findByOwnerId(Long ownerId);
    Optional<Organization> findFirstByOwnerId(Long ownerId);
}
