# Phân hệ Cổng vào và Tài khoản (identity-service & api-gateway) — LearnHub

- **Sinh viên phụ trách**: Lâm Thu Thùy
- **GitHub**: [thuy1411](https://github.com/thuy1411)
- **Email**: `2311060387@hunre.edu.vn`
- **Nhiệm vụ đồ án (Người 1)**: Cổng vào và tài khoản (`api-gateway`, `identity-service`, `platform-common`)

---

## 1. Tổng quan chức năng & Use Cases

Phân hệ `identity-service` kết hợp cùng `api-gateway` và `platform-common` chịu trách nhiệm toàn bộ về xác thực, phân quyền và quản lý tài khoản người dùng trên hệ thống LearnHub:

1. **Đăng ký tài khoản (Register Use Case)**:
   - Cho phép người dùng đăng ký tài khoản mới với email và mật khẩu (được mã hóa BCrypt).
   - Tự động phát sinh mã xác thực email và lưu vết giao dịch email outbox (`EmailOutbox`).

2. **Đăng nhập & Cấp phát JWT (Login & JWT Authentication)**:
   - Xác thực thông tin đăng nhập, cấp Access Token (JWT) và Refresh Token (`RefreshToken`).
   - `platform-common` hỗ trợ giải mã JWT, xác thực chữ ký và trích xuất thông tin người dùng (`AuthUser`, `CurrentUser`).

3. **Xác thực Email (Email Verification)**:
   - Xác minh quyền sở hữu email của tài khoản trước khi kích hoạt đầy đủ các tính năng hệ thống.

4. **Khóa tài khoản & Bảo mật (Account Lockout & Security)**:
   - Tự động theo dõi số lần đăng nhập thất bại.
   - Hỗ trợ cơ chế khóa tài khoản tạm thời hoặc vĩnh viễn khi có dấu hiệu bất thường.
   - API nội bộ nhận cảnh báo tấn công từ Gateway để chặn IP (`/internal/security/blocked-ips`, `/internal/security/rate-limit`).

5. **API Gateway (Cổng 8080)**:
   - Cổng điều hướng tập trung cho toàn bộ ứng dụng (`http://localhost:8080`).
   - Lọc request qua `AuthHeaderFilter` và chống DoS/brute-force bằng `RateLimitFilter`.

---

## 2. Cấu trúc CSDL (`identity_db`)

Phân hệ sử dụng CSDL MySQL `identity_db` được khởi tạo và quản lý phiên bản qua Flyway migration:

- **`users` (`AppUser`)**: Lưu trữ thông tin tài khoản người dùng, bao gồm: `id`, `email`, `password_hash`, `full_name`, `role`, `status` (ACTIVE, LOCKED, UNVERIFIED), `failed_login_attempts`, `locked_until`, `created_at`, `updated_at`.
- **`refresh_tokens` (`RefreshToken`)**: Quản lý phiên làm việc, mã làm mới token, thời gian hết hạn và trạng thái thu hồi (`revoked`).
- **`email_outbox` (`EmailOutbox`)**: Lưu lịch sử gửi mail xác thực, mã OTP, trạng thái gửi và thời gian gửi.

---

## 3. Cấu trúc thư mục mã nguồn

```
identity-service/
├── pom.xml                                    # Thư viện Spring Boot, JPA, Security JWT, Flyway, MySQL
├── src/main/java/vn/edu/learnhub/identity/
│   ├── IdentityServiceApplication.java        # Điểm khởi chạy Spring Boot identity-service (Port 8081)
│   ├── config/
│   │   └── DataSeeder.java                    # Tự động nạp dữ liệu mẫu ban đầu
│   ├── controller/
│   │   ├── AuthController.java                # REST API công khai xác thực (/api/auth)
│   │   ├── UserController.java                # REST API quản lý người dùng (/api/users)
│   │   └── InternalUserController.java        # API nội bộ quản lý bảo mật & chặn IP
│   ├── dto/
│   │   ├── AuthDtos.java                      # Request/Response DTO cho đăng ký, đăng nhập, token
│   │   └── UserDtos.java                      # DTO thông tin tài khoản người dùng
│   ├── entity/
│   │   ├── AppUser.java                       # Thực thể tài khoản người dùng
│   │   ├── RefreshToken.java                  # Thực thể Refresh Token
│   │   └── EmailOutbox.java                   # Thực thể hộp thư outbox xác thực
│   ├── repository/
│   │   ├── AppUserRepository.java
│   │   ├── RefreshTokenRepository.java
│   │   └── EmailOutboxRepository.java
│   └── service/
│       ├── AuthService.java                   # Xử lý đăng ký, đăng nhập, JWT, refresh token
│       ├── UserService.java                   # Xử lý thông tin profile, khóa/mở khóa tài khoản
│       ├── AccountMailService.java            # Xử lý mail xác thực và thông báo bảo mật
│       └── Roles.java                         # Định nghĩa danh sách vai trò (STUDENT, INSTRUCTOR, ADMIN)
└── src/main/resources/
    ├── application.properties                 # Cấu hình DB identity_db, JWT secret, server port
    └── db/migration/
        ├── V1__init_identity.sql              # Khởi tạo sơ đồ bảng identity_db
        └── V2__account_lock_mail.sql          # Bổ sung tính năng khóa tài khoản và email
```

---

## 4. Danh sách REST API Endpoints

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản mới |
| `POST` | `/api/auth/login` | Public | Đăng nhập lấy Access Token & Refresh Token |
| `POST` | `/api/auth/refresh` | Public | Cấp mới Access Token bằng Refresh Token |
| `POST` | `/api/auth/verify-email` | Public | Xác thực email đăng ký qua mã OTP |
| `GET` | `/api/users/me` | Authenticated | Lấy thông tin tài khoản cá nhân hiện tại |
| `PUT` | `/api/users/me` | Authenticated | Cập nhật thông tin tài khoản cá nhân |
| `POST` | `/api/users/{id}/lock` | `ADMIN` | Khóa tài khoản người dùng khi vi phạm |
| `POST` | `/api/users/{id}/unlock` | `ADMIN` | Mở khóa tài khoản người dùng |

---

## 5. Hướng dẫn chạy & Kiểm thử

### Chạy các service liên quan:
```bash
# Compile toàn bộ các module phụ thuộc
mvn compile -pl platform-common,identity-service,api-gateway

# Chạy identity-service (Port 8081)
mvn spring-boot:run -pl identity-service

# Chạy api-gateway (Port 8080)
mvn spring-boot:run -pl api-gateway
```

Truy cập API Gateway tại: `http://localhost:8080/api/auth/login`
