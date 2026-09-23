package vn.edu.learnhub.assist.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.assist.entity.HelpArticle;
import java.util.List;

public interface HelpArticleRepository extends JpaRepository<HelpArticle, Long> {
    List<HelpArticle> findByLocaleOrderByTitleAsc(String locale);
    boolean existsBySlugAndLocale(String slug, String locale);
}
