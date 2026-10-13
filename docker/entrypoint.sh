#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo "          Starting LearnHub Web on Render               "
echo "========================================================"

# 1. Substitute PORT in Nginx configuration
export PORT="${PORT:-10000}"
echo "=> Configuring Nginx to listen on port: ${PORT}"
mkdir -p /etc/nginx/conf.d
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# 2. Handle MySQL SSL CA certificate (e.g. from Aiven Secret File)
if [[ -n "${MYSQL_ATTR_SSL_CA:-}" && -f "${MYSQL_ATTR_SSL_CA}" ]]; then
    echo "=> Configuring MySQL CA Certificate from ${MYSQL_ATTR_SSL_CA}..."
    mkdir -p /run/app-certificates
    cp "${MYSQL_ATTR_SSL_CA}" /run/app-certificates/mysql-ca.pem
    chmod 644 /run/app-certificates/mysql-ca.pem
    export MYSQL_ATTR_SSL_CA=/run/app-certificates/mysql-ca.pem
fi

# 3. Environment defaults
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-3306}"
export DB_USER="${DB_USER:-root}"
export DB_PASSWORD="${DB_PASSWORD:-nam123}"
export DB_SSL="${DB_SSL:-true}"
export JWT_SECRET="${JWT_SECRET:-LearnHub-Shared-Secret-Key-2026-Doi-Trong-Moi-Truong-That}"
export INTERNAL_KEY="${INTERNAL_KEY:-learnhub-internal-key-2026}"

# JVM flags hop ly cho Spring Boot chay tren container 512MB RAM
JAVA_OPTS="-Xms24m -Xmx80m -XX:+UseSerialGC -Djava.security.egd=file:/dev/./urandom"

server_pids=()

cleanup() {
    echo "=> Stopping LearnHub services..."
    if (( ${#server_pids[@]} )); then
        kill -TERM "${server_pids[@]}" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup SIGTERM SIGINT EXIT

start_service() {
    local name="$1"
    local jar="/app/${name}.jar"
    if [[ -f "$jar" ]]; then
        echo "=> Starting ${name}..."
        # In truc tiep log ra man hinh de Render Dashboard nhin thay ro rang
        java $JAVA_OPTS -jar "$jar" 2>&1 | sed -u "s/^/[${name}] /" &
        local pid="$!"
        server_pids+=("$pid")
        sleep 2
    else
        echo "!! WARNING: Jar not found: $jar"
    fi
}

# 4. Khoi dong cac service cot loi cho web, dang nhap, admin va khoa hoc
echo "=> Launching core services for LearnHub (Identity, Catalog, Commerce, Gateway)..."
start_service "identity-service"
start_service "catalog-service"
start_service "commerce-service"
start_service "api-gateway"

# Neu nguoi dung cau hinh START_ALL_SERVICES=true thi chay them cac service con lai
if [[ "${START_ALL_SERVICES:-false}" == "true" ]]; then
    echo "=> START_ALL_SERVICES is true, launching additional services..."
    start_service "learning-service"
    start_service "content-service"
    start_service "social-service"
    start_service "org-service"
    start_service "assist-service"
    start_service "payment-service"
fi

# 5. Cho den khi API Gateway hoac Identity Service thuc su khoi dong xong va mo port
echo "=> Waiting for API Gateway (8080) and Identity Service (8081) to become ready..."
for i in {1..35}; do
    if curl -s "http://127.0.0.1:8080/api/auth/login" >/dev/null 2>&1 || curl -s "http://127.0.0.1:8081/auth/login" >/dev/null 2>&1; then
        echo "=> Core backend services are UP and responding!"
        break
    fi
    echo "=> Still waiting for backend services ($i/35)..."
    sleep 2
done

# 6. Kiem tra va khoi dong Nginx
echo "=> Testing Nginx configuration..."
nginx -t

echo "=> LearnHub is live! Starting Nginx reverse proxy on port ${PORT}..."
nginx -g "daemon off;"
