package vn.edu.learnhub.assist.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.assist.entity.HelpArticle;
import java.util.List;
import java.util.Optional;

public interface HelpArticleRepository extends JpaRepository<HelpArticle, Long> {
    List<HelpArticle> findByLocaleOrderByTitleAsc(String locale);
    boolean existsBySlugAndLocale(String slug, String locale);
    Optional<HelpArticle> findBySlugAndLocale(String slug, String locale);
}
