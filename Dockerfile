# syntax=docker/dockerfile:1
# path: Dockerfile
# purpose: Ho tro ca 2 che do:
# 1) Render / Standalone deploy: Goi toan bo Frontend (React) + 10 Backend Microservices + Nginx vao 1 container chay cong $PORT.
# 2) Docker Compose local: Chon tung service bang arg SERVICE va target single-service.

# ================= Stage 1: Build Web Frontend (React + Vite) =================
FROM node:20-alpine AS web-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

# ================= Stage 2: Build Java Backend Services =================
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /src
COPY pom.xml .
COPY platform-common ./platform-common
COPY api-gateway ./api-gateway
COPY identity-service ./identity-service
COPY catalog-service ./catalog-service
COPY learning-service ./learning-service
COPY content-service ./content-service
COPY commerce-service ./commerce-service
COPY social-service ./social-service
COPY org-service ./org-service
COPY assist-service ./assist-service
COPY payment-service ./payment-service

ARG SERVICE=""
RUN if [ -n "$SERVICE" ]; then \
      mvn -B -pl ${SERVICE} -am -DskipTests package; \
    else \
      mvn -B -DskipTests package; \
    fi

# ================= Stage 3A: Single Service (Dung cho Docker Compose) =================
FROM eclipse-temurin:21-jre AS single-service
ARG SERVICE
WORKDIR /app
RUN useradd -m -u 10001 appuser
COPY --from=backend-build /src/${SERVICE}/target/*.jar /app/app.jar
USER appuser
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

# ================= Stage 3B: Full Production Container (Dung cho Render Deploy) =================
FROM eclipse-temurin:21-jre AS full-production
USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx curl gettext-base tini bash ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Frontend da build sang thu muc Nginx
COPY --from=web-build /app/web/dist /var/www/html

# Copy tat ca cac file JAR backend
COPY --from=backend-build /src/api-gateway/target/*.jar /app/api-gateway.jar
COPY --from=backend-build /src/identity-service/target/*.jar /app/identity-service.jar
COPY --from=backend-build /src/catalog-service/target/*.jar /app/catalog-service.jar
COPY --from=backend-build /src/learning-service/target/*.jar /app/learning-service.jar
COPY --from=backend-build /src/content-service/target/*.jar /app/content-service.jar
COPY --from=backend-build /src/commerce-service/target/*.jar /app/commerce-service.jar
COPY --from=backend-build /src/social-service/target/*.jar /app/social-service.jar
COPY --from=backend-build /src/org-service/target/*.jar /app/org-service.jar
COPY --from=backend-build /src/assist-service/target/*.jar /app/assist-service.jar
COPY --from=backend-build /src/payment-service/target/*.jar /app/payment-service.jar

# Copy cau hinh Nginx va script entrypoint
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV PORT=10000
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl --fail --silent "http://127.0.0.1:${PORT}/up" > /dev/null || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
