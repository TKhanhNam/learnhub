package vn.edu.learnhub.catalog.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import vn.edu.learnhub.catalog.dto.CatalogDtos;
import vn.edu.learnhub.catalog.entity.Course;
import vn.edu.learnhub.catalog.repository.CategoryRepository;
import vn.edu.learnhub.catalog.repository.CourseRepository;
import vn.edu.learnhub.platform.cache.TtlCache;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test phan he catalog-service.
 * Sinh vien: Tran Thanh Binh (binh.pl.5b@gmail.com)
 */
@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private CategoryRepository categoryRepository;

    private CatalogService catalogService;

    @BeforeEach
    void setUp() {
        catalogService = new CatalogService(courseRepository, categoryRepository, new TtlCache());
    }

    @Test
    @DisplayName("Danh sach khoa hoc giang vien mac dinh sort id DESC va gioi han size 200")
    void getMyCoursesAppliesDefaultSortAndCapsPageSize() {
        when(courseRepository.findByInstructorId(eq(9L), any(Pageable.class)))
                .thenAnswer(invocation -> {
                    Pageable pageable = invocation.getArgument(1);
                    assertEquals(200, pageable.getPageSize());
                    Sort.Order order = pageable.getSort().getOrderFor("id");
                    assertTrue(order != null && order.isDescending());
                    return new PageImpl<>(List.of(sampleCourse("Spring Boot co ban")), pageable, 1);
                });
        when(categoryRepository.findById(1L)).thenReturn(Optional.empty());

        Page<CatalogDtos.CourseSummaryDTO> page = catalogService.getMyCourses(
                9L, PageRequest.of(0, 500));

        assertEquals(1, page.getTotalElements());
        assertEquals("Spring Boot co ban", page.getContent().get(0).title());
    }

    @Test
    @DisplayName("Most viewed dung viewCount khi khoa da co luot xem")
    void getMostViewedUsesViewCountWhenPresent() {
        Course popular = sampleCourse("Khoa xem nhieu");
        popular.setViewCount(40);
        when(courseRepository.findByStatusOrderByViewCountDesc(eq(Course.STATUS_PUBLISHED), any(Pageable.class)))
                .thenReturn(List.of(popular));
        when(categoryRepository.findById(1L)).thenReturn(Optional.empty());

        List<CatalogDtos.CourseSummaryDTO> result = catalogService.getMostViewed(6);

        assertEquals(1, result.size());
        assertEquals("Khoa xem nhieu", result.get(0).title());
    }

    @Test
    @DisplayName("Ky nang thinh hanh dem tan suat trong khoa da xuat ban")
    void getTrendingSkillsCountsPublishedSkills() {
        when(courseRepository.findAllSkills(Course.STATUS_PUBLISHED))
                .thenReturn(List.of("Java,Spring", "Java", "Docker"));

        List<CatalogDtos.TrendingSkillDTO> skills = catalogService.getTrendingSkills(5);

        assertEquals("Java", skills.get(0).skill());
        assertEquals(2L, skills.get(0).courseCount());
    }

    @Test
    @DisplayName("Ghi nhan luot xem chi tang khi khoa da published")
    void recordAccessIncrementsPublishedCourseOnly() {
        Course published = sampleCourse("Da xuat ban");
        published.setStatus(Course.STATUS_PUBLISHED);
        when(courseRepository.findById(3L)).thenReturn(Optional.of(published));

        catalogService.recordAccess(3L);

        verify(courseRepository).incrementViewCount(3L);
    }

    private static Course sampleCourse(String title) {
        Course course = new Course();
        course.setTitle(title);
        course.setSlug("khoa-mau");
        course.setSubtitle("");
        course.setDescription("");
        course.setCategoryId(1L);
        course.setInstructorId(9L);
        course.setPrice(new BigDecimal("199000"));
        course.setStatus(Course.STATUS_PUBLISHED);
        course.setViewCount(0);
        return course;
    }
}
