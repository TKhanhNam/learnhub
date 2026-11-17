# LearnHub

LearnHub is an online course marketplace. Learners browse and buy courses, instructors publish lessons, organizations manage seats for their staff, and administrators moderate the catalog, payouts, and reports. The web client talks only to one API gateway. Each business area is a separate Spring Boot service with its own MySQL schema.

The repository is an academic software-engineering project maintained by [TKhanhNam](https://github.com/TKhanhNam). Git history records contributions from the project team.

## What a reviewer can see

| Role | What the product does |
| --- | --- |
| Student | Search the catalog, save favorites, pay, watch lessons, track progress, and download a certificate |
| Instructor | Open a studio, submit a course for review, manage lessons, and see sales |
| Organization admin | Assign courses to members of an organization |
| Platform admin | Approve courses, manage users, coupons, revenue, analytics, and support reports |
| Partner | Read the public course list with an API key, without using the website |

Payments can complete through a MoMo return and IPN flow. An assist service answers product questions for signed-in users, with a separate key pool and safety checks for admin and instructor tools. Email verification and password reset are part of the identity service.

The Flutter app in `mobile/` is a small phone prototype (login and a course list). The graded product is the web application and the backend services.

## Architecture

```text
Browser (React)  --->  API Gateway :8080  --->  identity   :8081   identity_db
                                         --->  catalog    :8082   catalog_db
                                         --->  learning   :8083   learning_db
                                         --->  content    :8084   content_db
                                         --->  commerce   :8085   commerce_db
                                         --->  social     :8086   social_db
                                         --->  org        :8087   org_db
                                         --->  assist     :8088   assist_db
                                         --->  payment    :8089   payment_db
```

Design choices that matter for this project:

- **One front door.** CORS, routing, and rate limits live on the gateway. The React app never calls a service port directly.
- **Database per service.** Nine schemas. A service does not read another service's tables. Cross-service work uses HTTP with an internal API key.
- **Stateless authentication.** Identity issues JWT access and refresh tokens. Other services validate the same shared secret.
- **Local infrastructure.** MySQL stores data. Redis, RabbitMQ, and MinIO are in Docker Compose for cache, messaging, and lesson files when you run the full stack.
- **One production container.** The root `Dockerfile` can build the React app, all Java services, and Nginx into a single image for a small-host deploy (Render). `docker compose` can also run each service in its own container.

Gateway routes (all under `/api`, rewritten to the service path):

| Prefix | Service |
| --- | --- |
| `/api/auth`, `/api/users` | identity-service |
| `/api/catalog`, `/api/public/courses` | catalog-service |
| `/api/content` | content-service |
| `/api/commerce` | commerce-service |
| `/api/learning` | learning-service |
| `/api/social` | social-service |
| `/api/org` | org-service |
| `/api/assist` | assist-service |
| `/api/payment` | payment-service |

`/api/public/courses` requires the partner header `X-API-KEY`. Login and registration are limited more tightly than normal browsing.

## Technology

| Layer | Choice |
| --- | --- |
| Web | React 19, TypeScript, Vite, React Router |
| Mobile prototype | Flutter |
| Services | Java 21, Spring Boot 3.3, Spring Cloud Gateway, Spring Security, Spring Data JPA |
| Data | MySQL 8 (one schema per service), Flyway migrations |
| Supporting services | Redis 7, RabbitMQ 3, MinIO-compatible object storage |
| Edge | Nginx in the production image |
| Build | Maven multi-module reactor (`pom.xml` at the root) |

## Repository map

```text
learnhub/
  api-gateway/          routing, CORS, rate limit
  platform-common/      JWT filter and shared security helpers
  identity-service/     accounts, roles, email verification, password reset
  catalog-service/      course catalog and partner API
  content-service/      lessons and media
  commerce-service/     cart, orders, coupons
  payment-service/      MoMo return and IPN
  learning-service/     progress and certificates
  social-service/       reviews and community actions
  org-service/          organization seats
  assist-service/       in-product assistant and help articles
  web/                  React application
  mobile/               Flutter prototype
  docker/               Nginx and container entrypoint
  scripts/              local database init and run-all script
  Dockerfile            single-service image and full production image
  docker-compose.yml    MySQL, Redis, RabbitMQ, MinIO, and all services
```

## Run it locally (Windows)

Requirements: JDK 21, Maven, Node.js 20+, and MySQL 8 on port 3306.

1. Create the nine schemas if they do not exist (`identity_db`, `catalog_db`, `content_db`, `commerce_db`, `learning_db`, `social_db`, `org_db`, `assist_db`, `payment_db`). `scripts/init-databases.sql` is the same script Docker uses.
2. Point each service at that MySQL user with `DB_USER` and `DB_PASSWORD`. Do not commit a real password. Local defaults used by this course environment are described in `docker-compose.yml`; change them before any shared or public deployment.
3. Start the backend:

```powershell
cd C:\HDV\learnhub
powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1
```

On Windows you can also double-click `start.bat` (starts MySQL80 if it is installed as a service, then the backend and the web app) and `stop.bat`.

4. Start the web app in a second terminal:

```powershell
cd C:\HDV\learnhub\web
npm install
npm run dev
```

5. Open **http://localhost:5173**. The API gateway is **http://localhost:8080**.

### Demo accounts

These users are inserted by the identity seeder on an empty database. They are for local demonstration only.

| Username | Password | Role |
| --- | --- | --- |
| `student1` | `student123` | Student |
| `teacher1` | `teacher123` | Instructor |
| `admin` | `admin123` | Administrator |
| `orgadmin` | `org12345` | Organization admin |

Coupon code seeded for checkout: `LEARNHUB20`.

A second administrator can be created at startup with `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_ADMIN_NAME`.

### Docker Compose

From the repository root:

```bash
docker compose up -d --build
```

To start only the infrastructure and run the Java services from an IDE:

```bash
docker compose up -d mysql redis rabbitmq minio
```

Compose publishes MySQL on host port **3307** so it does not collide with a local MySQL on 3306. Set `JWT_SECRET`, `INTERNAL_KEY`, `DB_PASSWORD`, and `MINIO_PASSWORD` in the environment before you use this outside a classroom machine.

### Production-style image

The default Docker target builds the website and every service into one container. Nginx serves the static site and proxies `/api` to the gateway. The process listens on `$PORT` (Render sets this). `DB_HOST`, `DB_SSL`, `JWT_SECRET`, and the internal key must be provided by the host. JVM heap size in the entrypoint is kept small so the process fits a low-memory instance.

## Security notes for anyone cloning this repository

Classroom defaults (database password, JWT secret, internal key, partner API key) are in configuration so a reviewer can boot the system. They are not production secrets. Before a public deployment:

- replace `JWT_SECRET`, `INTERNAL_KEY`, the partner API key, and every database password
- keep payment, identity, and assist secret files out of git (they are listed in `.gitignore`)
- turn on TLS to MySQL with `DB_SSL` when the database is a hosted service such as Aiven

## Build and test

```bash
mvn -B test
cd web && npm install && npm run build
```

Automated tests today cover shared bank-link encryption, the assist key pool, and content-service rules. Integration evidence for the course (checkout, admin review, certificates) is in `docs/test-screenshots/`.

## Web routes worth opening

| Path | Who |
| --- | --- |
| `/` and `/courses` | Public catalog |
| `/courses/:slug` | Course page |
| `/cart`, `/orders`, `/learning`, `/learn/:courseId`, `/certificates` | Signed-in learner |
| `/studio` and `/sell` | Instructor |
| `/org` | Organization admin |
| `/admin` | Platform admin |

## License and academic use

This repository is submitted as coursework and as a portfolio for scholarship review. Please use the demo accounts above rather than creating a production payment or mail configuration. Third-party libraries keep their own licenses (Spring, React, and the Three.js files under `web/public/vendor`).
