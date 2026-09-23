// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/repository/CategoryRepository.java
// purpose: truy van danh muc khoa hoc.

package vn.edu.learnhub.catalog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.learnhub.catalog.entity.Category;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findBySlug(String slug);

    List<Category> findAllByOrderByNameAsc();
}
