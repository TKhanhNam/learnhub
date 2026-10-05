# Phan he Catalog (catalog-service) — LearnHub

- **Sinh vien phu trach**: Tran Thanh Binh
- **Email**: `binh.pl.5b@gmail.com`
- **Nhiem vu**: catalog-service — tim kiem khoa hoc, duyet khoa, coupon giang vien
- **Nhanh**: `binh-catalog-and-content-service`

---

## 1. Tong quan

`catalog-service` giu thong tin **ban khoa hoc** (tieu de, gia, danh muc, trang thai duyet, luot xem).
Bai giang/video nam o `content-service`. Quyen hoc vien nam o `learning-service`.

Chuc nang chinh:
1. Tim kiem / loc / phan trang khoa hoc da xuat ban (Cache-Aside).
2. CRUD khoa hoc cua giang vien, gui duyet, admin moderate.
3. Khoa hoc xem nhieu (`view_count`), best seller, ky nang thinh hanh.
4. Coupon giang vien / san; API noi bo cho commerce khi thanh toan.

---

## 2. Cau truc ma nguon

```
catalog-service/
├── pom.xml
├── src/main/java/vn/edu/learnhub/catalog/
│   ├── CatalogServiceApplication.java
│   ├── config/DataSeeder.java
│   ├── controller/
│   │   ├── CatalogController.java
│   │   └── InternalCatalogController.java
│   ├── dto/CatalogDtos.java
│   ├── entity/Category.java, Course.java, Coupon.java
│   ├── repository/
│   └── service/CatalogService.java, CouponService.java
├── src/main/resources/
│   ├── application.properties
│   └── db/migration/V1..V4
└── src/test/java/vn/edu/learnhub/catalog/service/CatalogServiceTest.java
```

---

## 3. REST API (qua Gateway `/api/catalog/**`)

| Phuong thuc | Duong dan | Quyen | Mo ta |
|---|---|---|---|
| `GET` | `/catalog/courses` | Public | Tim kiem khoa da xuat ban |
| `GET` | `/catalog/courses/{slugOrId}` | Public | Chi tiet khoa |
| `GET` | `/catalog/categories` | Public | Danh muc |
| `GET` | `/catalog/most-viewed` | Public | Khoa xem nhieu |
| `POST` | `/catalog/courses/{id}/view` | Public | Ghi nhan luot xem |
| `GET` | `/catalog/instructor/courses` | INSTRUCTOR, ADMIN | Khoa cua giang vien (id moi nhat, toi da 200) |
| `POST` | `/catalog/courses` | INSTRUCTOR, ADMIN | Tao khoa (DRAFT) |
| `PATCH` | `/catalog/admin/courses/{id}/moderate` | ADMIN | APPROVE / REJECT / UNPUBLISH |

Cong mac dinh: `http://localhost:8082`.

---

## 4. Chay test

```bash
mvn test -pl catalog-service
```
