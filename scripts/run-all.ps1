# path: scripts/run-all.ps1
# purpose: chay ca 9 service backend tren may Windows (khong can Docker).
# Yeu cau: MySQL (XAMPP) dang chay va da tao 8 database bang scripts/init-databases.sql
#
#   powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$services = @(
    @{ Name = "identity-service"; Port = 8081 },
    @{ Name = "catalog-service";  Port = 8082 },
    @{ Name = "learning-service"; Port = 8083 },
    @{ Name = "content-service";  Port = 8084 },
    @{ Name = "commerce-service"; Port = 8085 },
    @{ Name = "social-service";   Port = 8086 },
    @{ Name = "org-service";      Port = 8087 },
    @{ Name = "assist-service";   Port = 8088 },
    @{ Name = "api-gateway";      Port = 8080 }
)

Write-Host "Build toan bo project truoc khi chay..." -ForegroundColor Cyan
Push-Location $root
& "$root\mvnw.cmd" -q -DskipTests package
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    throw "Build that bai, dung lai."
}
Pop-Location

foreach ($service in $services) {
    $jar = Get-ChildItem "$root\$($service.Name)\target\*.jar" -ErrorAction SilentlyContinue |
           Where-Object { $_.Name -notlike "*sources*" } | Select-Object -First 1
    if (-not $jar) {
        Write-Host "Khong tim thay jar cua $($service.Name), bo qua." -ForegroundColor Yellow
        continue
    }
    Write-Host "Khoi dong $($service.Name) tai cong $($service.Port)" -ForegroundColor Green
    Start-Process -FilePath "java" -ArgumentList @("-jar", $jar.FullName) -WindowStyle Minimized
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "Xong. Gateway: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Frontend: cd web; npm install; npm run dev  ->  http://localhost:5173" -ForegroundColor Cyan
