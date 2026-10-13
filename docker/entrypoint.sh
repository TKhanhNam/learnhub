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
export JWT_SECRET="${JWT_SECRET:-LearnHub-Shared-Secret-Key-2026-Doi-Trong-Moi-Truong-That}"
export INTERNAL_KEY="${INTERNAL_KEY:-learnhub-internal-key-2026}"

JAVA_OPTS="-Xms20m -Xmx40m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Djava.security.egd=file:/dev/./urandom"

# 4. Start backend microservices in background
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
        java $JAVA_OPTS -jar "$jar" > "/var/log/${name}.log" 2>&1 &
        server_pids+=("$!")
        sleep 1
    fi
}

mkdir -p /var/log

# Start domain microservices
start_service "identity-service"
start_service "catalog-service"
start_service "learning-service"
start_service "content-service"
start_service "commerce-service"
start_service "social-service"
start_service "org-service"
start_service "assist-service"
start_service "payment-service"

# Start API Gateway (port 8080)
start_service "api-gateway"

echo "=> Backend services launched. Testing Nginx configuration..."
nginx -t

echo "=> LearnHub is ready! Starting Nginx reverse proxy..."
nginx -g "daemon off;"
