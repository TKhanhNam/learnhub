package vn.edu.learnhub.assist.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.assist.entity.AssistChat;

import java.util.List;

public interface AssistChatRepository extends JpaRepository<AssistChat, Long> {
    List<AssistChat> findByUserIdOrderByCreatedAtDesc(Long userId);
}
