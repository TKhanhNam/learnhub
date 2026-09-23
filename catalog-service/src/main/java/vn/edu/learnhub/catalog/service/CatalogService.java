// path: catalog-service/src/main/java/vn/edu/learnhub/catalog/service/CatalogService.java
// purpose: toan bo nghiep vu catalog: tim kiem/loc/phan trang, CRUD khoa hoc, duyet khoa hoc,
// danh muc, ky nang thinh hanh. Ap dung Cache-Aside cho cac truy van doc nhieu.

package vn.edu.learnhub.catalog.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.catalog.dto.CatalogDtos;
import vn.edu.learnhub.catalog.entity.Category;
import vn.edu.learnhub.catalog.entity.Course;
import vn.edu.learnhub.catalog.repository.CategoryRepository;
import vn.edu.learnhub.catalog.repository.CourseRepository;
import vn.edu.learnhub.platform.cache.TtlCache;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.AuthUser;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class CatalogService {

    private static final BigDecimal MAX_PRICE = new BigDecimal("999999999");
    private static final String CACHE_PREFIX_COURSES = "courses:";
    private static final String CACHE_KEY_CATEGORIES = "categories:all";

    private final CourseRepository courseRepository;
    private final CategoryRepository categoryRepository;
    private final TtlCache cache;

    @Value("${cache.courses-ttl-ms:60000}")
    private long coursesTtlMs;

    @Value("${cache.categories-ttl-ms:300000}")
    private long categoriesTtlMs;

    public CatalogService(CourseRepository courseRepository,
                          CategoryRepository categoryRepository,
                          TtlCache cache) {
        this.courseRepository = courseRepository;
        this.categoryRepository = categoryRepository;
        this.cache = cache;
    }

    // ---------------------------------------------------------------- doc

    @SuppressWarnings("unchecked")
    public Page<CatalogDtos.CourseSummaryDTO> searchPublished(String keyword,
                                                              String categorySlug,
                                                              String level,
                                                              String language,
                                                              BigDecimal minPrice,
                                                              BigDecimal maxPrice,
                                                              Pageable pageable) {
        Long categoryId = 0L;
        if (categorySlug != null && !categorySlug.isBlank()) {
            categoryId = categoryRepository.findBySlug(categorySlug)
                    .map(Category::getId)
                    .orElseThrow(() -> BusinessException.notFound("Danh muc khong ton tai"));
        }

        String safeKeyword = keyword == null ? "" : keyword.trim();
        String safeLevel = level == null ? "" : level.trim().toUpperCase();
        String safeLanguage = language == null ? "" : language.trim();
        BigDecimal from = minPrice == null ? BigDecimal.ZERO : minPrice;
        BigDecimal to = maxPrice == null ? MAX_PRICE : maxPrice;

        String cacheKey = CACHE_PREFIX_COURSES + String.join("|",
                safeKeyword, String.valueOf(categoryId), safeLevel, safeLanguage,
                from.toPlainString(), to.toPlainString(),
                String.valueOf(pageable.getPageNumber()), String.valueOf(pageable.getPageSize()),
                pageable.getSort().toString());

        final Long finalCategoryId = categoryId;
        return (Page<CatalogDtos.CourseSummaryDTO>) cache.get(cacheKey, coursesTtlMs, () -> {
            Page<Course> page = courseRepository.search(Course.STATUS_PUBLISHED, safeKeyword,
                    finalCategoryId, safeLevel, safeLanguage, from, to, pageable);
            List<CatalogDtos.CourseSummaryDTO> content = toSummaries(page.getContent());
            return new PageImpl<>(content, pageable, page.getTotalElements());
        });
    }

    @Transactional(readOnly = true)
    public CatalogDtos.CourseDetailDTO getPublicDetail(String slugOrId) {
        Course course = findBySlugOrId(slugOrId);

        if (!Course.STATUS_PUBLISHED.equals(course.getStatus())) {
            // Khoa chua duyet: chi chu khoa hoc hoac admin moi xem duoc
            AuthUser authUser = CurrentUser.get();
            boolean owner = authUser != null && course.getInstructorId().equals(authUser.userId());
            boolean admin = authUser != null && authUser.isAdmin();
            if (!owner && !admin) {
                throw BusinessException.notFound("Khoa hoc khong ton tai hoac chua duoc phat hanh");
            }
        }
        return toDetail(course);
    }

    /** Tang them 1 luot khi hoc vien bam / tim thay khoa trong ket qua. */
    @Transactional
    public void recordAccess(Long courseId) {
        if (courseId == null) {
            return;
        }
        courseRepository.findById(courseId).ifPresent(course -> {
            if (Course.STATUS_PUBLISHED.equals(course.getStatus())) {
                courseRepository.incrementViewCount(courseId);
            }
        });
    }

    @SuppressWarnings("unchecked")
    public List<CatalogDtos.CategoryDTO> getCategories() {
        return (List<CatalogDtos.CategoryDTO>) cache.get(CACHE_KEY_CATEGORIES, categoriesTtlMs,
                () -> categoryRepository.findAllByOrderByNameAsc().stream()
                        .map(category -> new CatalogDtos.CategoryDTO(category.getId(), category.getName(),
                                category.getSlug(), category.getDescription()))
                        .toList());
    }

    /** "Ky nang dang thinh hanh" = ky nang xuat hien nhieu nhat trong cac khoa da phat hanh. */
    public List<CatalogDtos.TrendingSkillDTO> getTrendingSkills(int limit) {
        Map<String, Long> counter = new HashMap<>();
        for (String raw : courseRepository.findAllSkills(Course.STATUS_PUBLISHED)) {
            for (String skill : splitSkills(raw)) {
                counter.merge(skill, 1L, Long::sum);
            }
        }
        return counter.entrySet().stream()
                .map(entry -> new CatalogDtos.TrendingSkillDTO(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparingLong(CatalogDtos.TrendingSkillDTO::courseCount).reversed())
                .limit(limit)
                .toList();
    }

    public List<CatalogDtos.CourseSummaryDTO> getBestSellers(int limit) {
        return toSummaries(courseRepository.findByStatusOrderByEnrollmentCountDesc(
                Course.STATUS_PUBLISHED, PageRequest.of(0, limit)));
    }

    /** 6 khoa duoc truy cap / xem nhieu nhat; neu chua co view thi fallback enrollment. */
    public List<CatalogDtos.CourseSummaryDTO> getMostViewed(int limit) {
        int size = Math.max(1, Math.min(limit, 20));
        List<Course> byViews = courseRepository.findByStatusOrderByViewCountDesc(
                Course.STATUS_PUBLISHED, PageRequest.of(0, size));
        boolean hasViews = byViews.stream().anyMatch(c -> coalesceView(c.getViewCount()) > 0);
        if (!hasViews) {
            return getBestSellers(size);
        }
        return toSummaries(byViews);
    }

    private static int coalesceView(Integer viewCount) {
        return viewCount == null ? 0 : viewCount;
    }

    public Page<CatalogDtos.CourseSummaryDTO> getMyCourses(Long instructorId, Pageable pageable) {
        return courseRepository.findByInstructorId(instructorId, pageable).map(this::toSummary);
    }

    public Page<CatalogDtos.CourseSummaryDTO> getByStatus(String status, String keyword, Pageable pageable) {
        String safeKeyword = keyword == null ? "" : keyword.trim();
        boolean all = status == null || status.isBlank() || "ALL".equalsIgnoreCase(status);
        if (all && safeKeyword.isEmpty()) {
            return courseRepository.findAll(pageable).map(this::toSummary);
        }
        if (all) {
            return courseRepository.findByTitleContainingIgnoreCase(safeKeyword, pageable).map(this::toSummary);
        }
        String normalized = status.trim().toUpperCase();
        if (safeKeyword.isEmpty()) {
            return courseRepository.findByStatus(normalized, pageable).map(this::toSummary);
        }
        return courseRepository.findByStatusAndTitleContainingIgnoreCase(normalized, safeKeyword, pageable)
                .map(this::toSummary);
    }

    public CatalogDtos.AdminStatsDTO adminStats() {
        return new CatalogDtos.AdminStatsDTO(
                courseRepository.count(),
                courseRepository.countByStatusValue(Course.STATUS_DRAFT),
                courseRepository.countByStatusValue(Course.STATUS_PENDING),
                courseRepository.countByStatusValue(Course.STATUS_PUBLISHED),
                courseRepository.countByStatusValue(Course.STATUS_REJECTED),
                courseRepository.sumEnrollments());
    }

    public byte[] exportExcel() {
        List<Course> courses = courseRepository.findAll();
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Khoa hoc");
            String[] headers = {"ID", "Tieu de", "Trang thai", "Gia", "Danh muc", "Giang vien", "Hoc vien", "Danh gia"};
            org.apache.poi.ss.usermodel.Row head = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                head.createCell(i).setCellValue(headers[i]);
            }
            int rowIdx = 1;
            for (Course course : courses) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(course.getId());
                row.createCell(1).setCellValue(course.getTitle());
                row.createCell(2).setCellValue(course.getStatus());
                row.createCell(3).setCellValue(course.getPrice() == null ? 0 : course.getPrice().doubleValue());
                row.createCell(4).setCellValue(categoryName(course.getCategoryId()));
                row.createCell(5).setCellValue(course.getInstructorId());
                row.createCell(6).setCellValue(course.getEnrollmentCount() == null ? 0 : course.getEnrollmentCount());
                row.createCell(7).setCellValue(course.getRatingAvg() == null ? 0 : course.getRatingAvg().doubleValue());
            }
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw BusinessException.badRequest("Khong xuat duoc Excel khoa hoc");
        }
    }

    // ---------------------------------------------------------------- ghi

    @Transactional
    public CatalogDtos.CourseDetailDTO create(CatalogDtos.CourseRequest request) {
        AuthUser authUser = CurrentUser.require();
        categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> BusinessException.badRequest("Danh muc khong ton tai"));

        Course course = new Course();
        course.setInstructorId(authUser.userId());
        course.setSlug(uniqueSlug(request.title()));
        course.setCreatedAt(Instant.now());
        applyRequest(course, request);
        course.setStatus(Course.STATUS_DRAFT);

        courseRepository.save(course);
        cache.evictPrefix(CACHE_PREFIX_COURSES);
        return toDetail(course);
    }

    @Transactional
    public CatalogDtos.CourseDetailDTO update(Long id, CatalogDtos.CourseRequest request) {
        Course course = findById(id);
        // ABAC: giang vien chi sua khoa CUA MINH, admin sua duoc tat ca
        CurrentUser.requireOwnerOrAdmin(course.getInstructorId(), "Ban chi duoc sua khoa hoc cua minh");

        categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> BusinessException.badRequest("Danh muc khong ton tai"));

        applyRequest(course, request);
        courseRepository.save(course);
        cache.evictPrefix(CACHE_PREFIX_COURSES);
        return toDetail(course);
    }

    @Transactional
    public void delete(Long id) {
        Course course = findById(id);
        CurrentUser.requireOwnerOrAdmin(course.getInstructorId(), "Ban chi duoc xoa khoa hoc cua minh");

        if (course.getEnrollmentCount() != null && course.getEnrollmentCount() > 0) {
            throw BusinessException.conflict(
                    "Khoa hoc da co hoc vien, khong the xoa. Hay an di (chuyen ve nhap) thay vi xoa");
        }
        courseRepository.delete(course);
        cache.evictPrefix(CACHE_PREFIX_COURSES);
    }

    /** Giang vien gui khoa hoc cho admin duyet. */
    @Transactional
    public CatalogDtos.CourseDetailDTO submitForReview(Long id) {
        Course course = findById(id);
        CurrentUser.requireOwnerOrAdmin(course.getInstructorId(), "Ban chi duoc gui khoa hoc cua minh");

        if (Course.STATUS_PUBLISHED.equals(course.getStatus())) {
            throw BusinessException.conflict("Khoa hoc da duoc phat hanh");
        }
        course.setStatus(Course.STATUS_PENDING);
        courseRepository.save(course);
        return toDetail(course);
    }

    /** Admin duyet hoac tu choi khoa hoc. */
    @Transactional
    public CatalogDtos.CourseDetailDTO moderate(Long id, String action) {
        Course course = findById(id);
        String normalized = action == null ? "" : action.trim().toUpperCase();

        switch (normalized) {
            case "APPROVE" -> {
                course.setStatus(Course.STATUS_PUBLISHED);
                if (course.getPublishedAt() == null) {
                    course.setPublishedAt(Instant.now());
                }
            }
            case "REJECT" -> course.setStatus(Course.STATUS_REJECTED);
            case "UNPUBLISH" -> course.setStatus(Course.STATUS_DRAFT);
            default -> throw BusinessException.badRequest("Hanh dong chi duoc la APPROVE, REJECT hoac UNPUBLISH");
        }

        courseRepository.save(course);
        cache.evictPrefix(CACHE_PREFIX_COURSES);
        return toDetail(course);
    }

    // ---------------------------------------------------------------- API noi bo

    public CatalogDtos.CourseSnapshotDTO getSnapshot(Long id) {
        Course course = findById(id);
        return new CatalogDtos.CourseSnapshotDTO(course.getId(), course.getSlug(), course.getTitle(),
                course.getThumbnailUrl(), course.getPrice(), course.getInstructorId(),
                course.isAiAssistEnabled(), course.getStatus());
    }

    public List<CatalogDtos.CourseSnapshotDTO> getSnapshots(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return courseRepository.findByIdIn(ids).stream()
                .map(course -> new CatalogDtos.CourseSnapshotDTO(course.getId(), course.getSlug(),
                        course.getTitle(), course.getThumbnailUrl(), course.getPrice(),
                        course.getInstructorId(), course.isAiAssistEnabled(), course.getStatus()))
                .toList();
    }

    @Transactional
    public void increaseEnrollment(Long courseId, int delta) {
        Course course = findById(courseId);
        int current = course.getEnrollmentCount() == null ? 0 : course.getEnrollmentCount();
        course.setEnrollmentCount(Math.max(0, current + delta));
        courseRepository.save(course);
        cache.evictPrefix(CACHE_PREFIX_COURSES);
    }

    /** social-service goi sang sau khi co review moi. */
    @Transactional
    public void updateRating(Long courseId, BigDecimal ratingAvg, Integer ratingCount) {
        Course course = findById(courseId);
        course.setRatingAvg(ratingAvg == null ? BigDecimal.ZERO : ratingAvg);
        course.setRatingCount(ratingCount == null ? 0 : ratingCount);
        courseRepository.save(course);
        cache.evictPrefix(CACHE_PREFIX_COURSES);
    }

    public long countByInstructor(Long instructorId) {
        return courseRepository.countByInstructorId(instructorId);
    }

    public long countPublished() {
        return courseRepository.countByStatusValue(Course.STATUS_PUBLISHED);
    }

    // ---------------------------------------------------------------- ho tro

    private void applyRequest(Course course, CatalogDtos.CourseRequest request) {
        course.setTitle(request.title().trim());
        course.setSubtitle(request.subtitle());
        course.setDescription(request.description());
        course.setCategoryId(request.categoryId());
        course.setPrice(request.price());
        if (request.level() != null && !request.level().isBlank()) {
            course.setLevel(request.level().trim().toUpperCase());
        }
        if (request.language() != null && !request.language().isBlank()) {
            course.setLanguage(request.language().trim());
        }
        course.setThumbnailUrl(request.thumbnailUrl());
        course.setPromoVideoUrl(request.promoVideoUrl());
        course.setSkills(request.skills() == null ? null : String.join(",", request.skills()));
        if (request.aiAssistEnabled() != null) {
            course.setAiAssistEnabled(request.aiAssistEnabled());
        }
    }

    private Course findById(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay khoa hoc"));
    }

    private Course findBySlugOrId(String slugOrId) {
        Optional<Course> bySlug = courseRepository.findBySlug(slugOrId);
        if (bySlug.isPresent()) {
            return bySlug.get();
        }
        try {
            return findById(Long.parseLong(slugOrId));
        } catch (NumberFormatException ex) {
            throw BusinessException.notFound("Khong tim thay khoa hoc");
        }
    }

    private List<CatalogDtos.CourseSummaryDTO> toSummaries(List<Course> courses) {
        return courses.stream().map(this::toSummary).toList();
    }

    private CatalogDtos.CourseSummaryDTO toSummary(Course course) {
        return new CatalogDtos.CourseSummaryDTO(course.getId(), course.getSlug(), course.getTitle(),
                course.getSubtitle(), course.getThumbnailUrl(), course.getPrice(), course.getLevel(),
                course.getLanguage(), course.getCategoryId(), categoryName(course.getCategoryId()),
                course.getInstructorId(), course.getRatingAvg(), course.getRatingCount(),
                course.getEnrollmentCount(), splitSkills(course.getSkills()),
                course.isAiAssistEnabled(), course.getStatus());
    }

    private CatalogDtos.CourseDetailDTO toDetail(Course course) {
        Category category = categoryRepository.findById(course.getCategoryId()).orElse(null);
        return new CatalogDtos.CourseDetailDTO(course.getId(), course.getSlug(), course.getTitle(),
                course.getSubtitle(), course.getDescription(), course.getThumbnailUrl(),
                course.getPromoVideoUrl(), course.getPrice(), course.getLevel(), course.getLanguage(),
                course.getCategoryId(), category == null ? null : category.getName(),
                category == null ? null : category.getSlug(), course.getInstructorId(),
                course.getRatingAvg(), course.getRatingCount(), course.getEnrollmentCount(),
                splitSkills(course.getSkills()), course.isAiAssistEnabled(), course.getStatus(),
                course.getCreatedAt(), course.getPublishedAt());
    }

    private String categoryName(Long categoryId) {
        return categoryRepository.findById(categoryId).map(Category::getName).orElse(null);
    }

    private List<String> splitSkills(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(skill -> !skill.isEmpty())
                .toList();
    }

    private String uniqueSlug(String title) {
        String base = toSlug(title);
        String candidate = base;
        int suffix = 2;
        while (courseRepository.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String toSlug(String input) {
        String normalized = Normalizer.normalize(input == null ? "" : input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("đ", "d").replace("Đ", "D")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return normalized.isBlank() ? "khoa-hoc" : normalized;
    }

    /** Dung cho seeder: tao danh muc neu chua co. */
    @Transactional
    public Category ensureCategory(String name, String slug, String description) {
        return categoryRepository.findBySlug(slug).map(existing -> {
            existing.setName(name);
            existing.setDescription(description);
            return categoryRepository.save(existing);
        }).orElseGet(() -> {
            Category category = new Category();
            category.setName(name);
            category.setSlug(slug);
            category.setDescription(description);
            return categoryRepository.save(category);
        });
    }

    /** Dung cho seeder: tao khoa hoc mau da phat hanh. */
    @Transactional
    public Course seedCourse(Course course) {
        course.setSlug(uniqueSlug(course.getTitle()));
        return courseRepository.save(course);
    }
}
