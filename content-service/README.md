# Phân hệ Quản lý Nội dung (content-service) — LearnHub

- **Sinh viên phụ trách**: Lâm Thu Thùy
- **GitHub**: [thuy1411](https://github.com/thuy1411)
- **Email**: `2311060387@hunre.edu.vn`
- **Nhiệm vụ đồ án**: Giảng viên - nội dung - content-service - MinIO, Notification service

---

## 1. Tổng quan chức năng

Phân hệ `content-service` chịu trách nhiệm cung cấp toàn bộ API quản lý nội dung đào tạo trên nền tảng LearnHub, bao gồm:
1. **Quản lý Bài giảng (Lectures)**:
   - Hỗ trợ các định dạng: Video trực tuyến, Bài đọc văn bản (HTML/Markdown), Slide thuyết trình (PDF).
   - Thiết lập thời lượng bài giảng (`durationSeconds`), thứ tự sắp xếp (`sortOrder`).
2. **Tích hợp MinIO Object Storage**:
   - Lưu trữ media (video bài giảng, slide tài liệu PDF đính kèm).
   - Cơ chế upload trực tiếp vào bucket `learnhub-content` qua `MinioStorageService`.
   - Sinh Presigned URL bảo mật giúp học viên tải/xem tài liệu an toàn.
3. **Quản lý Bài kiểm tra & Đánh giá (Quizzes & Assignments)**:
   - Tạo bài trắc nghiệm nhiều câu hỏi (`QuizQuestion`), tính điểm đạt chuẩn (`passScore`).
   - Giao bài tập nộp link thực hành (`Assignment`).
4. **Dịch vụ Thông báo (Content Notification Service)**:
   - Tự động phát thông báo khi giảng viên cập nhật bài giảng mới, đề thi hoặc bài tập.
   - Học viên ghi danh nhận thông báo cập nhật lộ trình khóa học.
5. **Giao diện Studio Giảng viên (`web/src/pages/StudioPage.tsx`)**:
   - Giao diện trực quan cho giảng viên thêm/sửa/xóa bài giảng, upload file MinIO và tạo quiz.

---

## 2. Cấu trúc thư mục mã nguồn

```
content-service/
├── pom.xml                                    # Khai báo thư viện (Spring Boot, JPA, MinIO SDK, Flyway, MySQL)
├── src/main/java/vn/edu/learnhub/content/
│   ├── ContentServiceApplication.java         # Điểm khởi chạy Spring Boot
│   ├── client/
│   │   ├── CatalogInternalClient.java         # Giao tiếp nội bộ với catalog-service
│   │   └── LearningInternalClient.java        # Giao tiếp nội bộ với learning-service
│   ├── controller/
│   │   ├── ContentController.java             # REST API công khai cho web & mobile
│   │   └── InternalContentController.java     # REST API bảo mật cho các microservice khác
│   ├── dto/
│   │   └── ContentDtos.java                   # Các Record DTO trao đổi dữ liệu
│   ├── entity/
│   │   ├── Lecture.java                       # Thực thể bài giảng
│   │   ├── Quiz.java                          # Thực thể đề kiểm tra
│   │   ├── QuizQuestion.java                  # Thực thể câu hỏi trắc nghiệm
│   │   └── Assignment.java                    # Thực thể bài tập thực hành
│   ├── notification/
│   │   └── ContentNotificationService.java    # Service phát thông báo sự kiện nội dung
│   ├── repository/
│   │   ├── LectureRepository.java
│   │   ├── QuizRepository.java
│   │   ├── QuizQuestionRepository.java
│   │   └── AssignmentRepository.java
│   └── service/
│       ├── ContentService.java                # Xử lý nghiệp vụ chính của nội dung
│       └── MinioStorageService.java           # Tích hợp MinIO Client upload media
├── src/main/resources/
│   ├── application.properties                 # Cấu hình cổng, DB, MinIO credentials
│   └── db/migration/
│       └── V1__init_content.sql               # Kịch bản khởi tạo bảng CSDL content_db
└── src/test/java/vn/edu/learnhub/content/service/
    └── ContentServiceTest.java                # Unit test kiểm thử nghiệp vụ (JUnit 5 + Mockito)
```

---

## 3. Danh sách REST API Endpoints

| Phương thức | Đường dẫn | Quyền truy cập | Mô tả |
|---|---|---|---|
| `GET` | `/content/courses/{courseId}/curriculum` | Public / Enrolled | Lấy đề cương khóa học (bài giảng, quiz, bài tập) |
| `POST` | `/content/courses/{courseId}/lectures` | `INSTRUCTOR`, `ADMIN` | Thêm bài giảng mới |
| `PUT` | `/content/lectures/{id}` | `INSTRUCTOR`, `ADMIN` | Chỉnh sửa bài giảng |
| `DELETE`| `/content/lectures/{id}` | `INSTRUCTOR`, `ADMIN` | Xóa bài giảng |
| `POST` | `/content/courses/{courseId}/lectures/upload` | `INSTRUCTOR`, `ADMIN` | Upload video/slide lên MinIO Storage |
| `POST` | `/content/courses/{courseId}/quizzes` | `INSTRUCTOR`, `ADMIN` | Tạo bài trắc nghiệm và bộ câu hỏi |
| `POST` | `/content/courses/{courseId}/assignments` | `INSTRUCTOR`, `ADMIN` | Tạo bài tập thực hành |
| `GET` | `/content/courses/{courseId}/notifications` | Public | Lấy thông báo mới nhất của khóa học |

---

## 4. Hướng dẫn chạy & Kiểm thử

### Chạy Unit Test:
```bash
mvn test -pl content-service
```

### Chạy độc lập Service:
```bash
mvn spring-boot:run -pl content-service
```
Dịch vụ chạy tại cổng: `http://localhost:8084` (hoặc thông qua API Gateway: `http://localhost:8080/api/content/**`).
