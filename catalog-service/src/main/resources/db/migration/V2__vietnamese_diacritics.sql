UPDATE category SET name = 'Lập trình', description = 'Java, Spring Boot, React, Python...' WHERE slug = 'lap-trinh';
UPDATE category SET name = 'Kinh doanh', description = 'Khởi nghiệp, quản trị, bán hàng' WHERE slug = 'kinh-doanh';
UPDATE category SET name = 'Thiết kế', description = 'UI/UX, Figma, đồ họa' WHERE slug = 'thiet-ke';
UPDATE category SET name = 'Marketing', description = 'Digital marketing, SEO, quảng cáo' WHERE slug = 'marketing';
UPDATE category SET name = 'AI', description = 'Machine Learning, LLM, ứng dụng AI' WHERE slug = 'ai';
UPDATE category SET name = 'Phát triển bản thân', description = 'Kỹ năng mềm, năng suất cá nhân' WHERE slug = 'phat-trien-ban-than';
UPDATE category SET name = 'Luyện thi chứng chỉ', description = 'AWS, CompTIA, PMI và các đề thi thử' WHERE slug = 'luyen-thi-chung-chi';

UPDATE course SET title = 'Java Spring Boot từ cơ bản đến microservices',
    subtitle = 'Học cách xây dựng hệ thống nhiều service thật sự chạy được',
    description = 'Học cách xây dựng hệ thống nhiều service thật sự chạy được. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'java-spring-boot-tu-co-ban-den-microservices%';
UPDATE course SET title = 'React + TypeScript cho người mới',
    subtitle = 'Từ component đầu tiên đến ứng dụng hoàn chỉnh',
    description = 'Từ component đầu tiên đến ứng dụng hoàn chỉnh. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'react-typescript-cho-nguoi-moi%';
UPDATE course SET title = 'Python cho phân tích dữ liệu',
    subtitle = 'Làm sạch, phân tích và trực quan hóa dữ liệu',
    description = 'Làm sạch, phân tích và trực quan hóa dữ liệu. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'python-cho-phan-tich-du-lieu%';
UPDATE course SET title = 'Thiết kế UI/UX với Figma',
    subtitle = 'Quy trình thiết kế sản phẩm số từ đầu đến cuối',
    description = 'Quy trình thiết kế sản phẩm số từ đầu đến cuối. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'thiet-ke-uiux-voi-figma%' OR slug LIKE 'thiet-ke-ui-ux-voi-figma%';
UPDATE course SET title = 'Digital Marketing thực chiến',
    subtitle = 'Chạy chiến dịch thật và đo lường hiệu quả',
    description = 'Chạy chiến dịch thật và đo lường hiệu quả. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'digital-marketing-thuc-chien%';
UPDATE course SET title = 'Khởi nghiệp tinh gọn cho người Việt',
    subtitle = 'Kiểm chứng ý tưởng trước khi đốt tiền',
    description = 'Kiểm chứng ý tưởng trước khi đốt tiền. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'khoi-nghiep-tinh-gon-cho-nguoi-viet%';
UPDATE course SET title = 'Ứng dụng LLM vào sản phẩm thực tế',
    subtitle = 'Từ prompt đến kiến trúc RAG cho doanh nghiệp',
    description = 'Từ prompt đến kiến trúc RAG cho doanh nghiệp. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'ung-dung-llm-vao-san-pham-thuc-te%';
UPDATE course SET title = 'Quản lý thời gian và năng suất cá nhân',
    subtitle = 'Hệ thống làm việc không bị quá tải',
    description = 'Hệ thống làm việc không bị quá tải. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'quan-ly-thoi-gian-va-nang-suat-ca-nhan%';
UPDATE course SET title = 'Luyện thi AWS Cloud Practitioner',
    subtitle = 'Kèm 3 đề thi thử sát đề thật',
    description = 'Kèm 3 đề thi thử sát đề thật. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'luyen-thi-aws-cloud-practitioner%';
UPDATE course SET title = 'Luyện thi PMI — quản lý dự án',
    subtitle = 'Ôn tập theo khung PMBOK kèm đề thi thử',
    description = 'Ôn tập theo khung PMBOK kèm đề thi thử. Khóa học gồm video bài giảng, tài liệu, quiz và bài tập thực hành.'
    WHERE slug LIKE 'luyen-thi-pmi%';
