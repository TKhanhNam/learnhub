# path: Dockerfile
# purpose: 1 Dockerfile dung chung cho moi service. Chon service bang build arg SERVICE.
# Vi du: docker build --build-arg SERVICE=identity-service -t learnhub/identity .

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY . .
ARG SERVICE
RUN mvn -B -pl ${SERVICE} -am -DskipTests package

FROM eclipse-temurin:21-jre
ARG SERVICE
WORKDIR /app
# Container khong chay bang root (Least Privilege - file cong nghe loi muc 5)
RUN useradd -m -u 10001 appuser
COPY --from=build /src/${SERVICE}/target/*.jar /app/app.jar
USER appuser
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
