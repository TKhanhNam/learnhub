package vn.edu.learnhub.org.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.org.entity.OrgMember;
import java.util.List;

public interface OrgMemberRepository extends JpaRepository<OrgMember, Long> {
    List<OrgMember> findByOrgId(Long orgId);
    long countByOrgId(Long orgId);
    boolean existsByOrgIdAndUserId(Long orgId, Long userId);
}
