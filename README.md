# LearnHub

San khoa hoc (kieu Udemy). Frontend chi goi API Gateway `http://localhost:8080`.

## Mo web (Windows)

1. Bat **MySQL Server** (cong 3306, user `root` / `nam123`). 8 schema: `identity_db`, `catalog_db`, `content_db`, `commerce_db`, `learning_db`, `social_db`, `org_db`, `assist_db`.
2. Chay backend:

```powershell
cd C:\HDV\learnhub
powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1
```

3. Mo frontend (terminal moi):

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
cd C:\HDV\learnhub\web
npm install
npm run dev
```

4. Trinh duyet: **http://localhost:5173**

Tai khoan demo: `student1` / `student123`, `teacher1` / `teacher123`, `admin` / `admin123`, `orgadmin` / `org12345`. Ma giam gia: `LEARNHUB20`.
