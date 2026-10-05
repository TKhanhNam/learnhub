package vn.edu.learnhub.identity.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.identity.entity.BlockedIp;

public interface BlockedIpRepository extends JpaRepository<BlockedIp, String> {
}
