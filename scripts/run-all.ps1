# path: scripts/run-all.ps1
# purpose: chay ca 10 service backend tren may Windows (khong can Docker).
# Yeu cau: MySQL dang chay va da tao database
#
#   powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1 -Rebuild

param (
    [switch]$Rebuild
)

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
    @{ Name = "payment-service";  Port = 8089 },
    @{ Name = "api-gateway";      Port = 8080 }
)

# Kiem tra xem co can build hay khong
$needBuild = $Rebuild
if (-not $needBuild) {
    foreach ($service in $services) {
        $jar = Get-ChildItem "$root\$($service.Name)\target\*.jar" -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -notlike "*sources*" -and $_.Name -notlike "*.original" } | Select-Object -First 1
        if (-not $jar -or $jar.Length -lt 1000000) {
            $needBuild = $true
            break
        }
    }
}

if ($needBuild) {
    Write-Host "Dung cac tien trinh Java cu de tranh khoa file khi build..." -ForegroundColor Yellow
    Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Write-Host "Build toan bo project truoc khi chay..." -ForegroundColor Cyan
    Push-Location $root
    & "$root\mvnw.cmd" -q -DskipTests package
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw "Build that bai, dung lai."
    }
    Pop-Location
} else {
    Write-Host "Cac file JAR da san sang, bo qua buoc build lai de tiet kiem thoi gian." -ForegroundColor Green
}

# Khoi dong tung service neu chua mo cong
foreach ($service in $services) {
    $portActive = Get-NetTCPConnection -LocalPort $service.Port -ErrorAction SilentlyContinue
    if ($portActive) {
        Write-Host "$($service.Name) dang chay san tai cong $($service.Port)." -ForegroundColor Yellow
        continue
    }

    $jar = Get-ChildItem "$root\$($service.Name)\target\*.jar" -ErrorAction SilentlyContinue |
           Where-Object { $_.Name -notlike "*sources*" -and $_.Name -notlike "*.original" } | Select-Object -First 1
    if (-not $jar) {
        Write-Host "Khong tim thay jar cua $($service.Name), bo qua." -ForegroundColor Yellow
        continue
    }
    Write-Host "Khoi dong $($service.Name) tai cong $($service.Port)..." -ForegroundColor Green
    Start-Process -FilePath "java" -ArgumentList @("-jar", $jar.FullName) -WorkingDirectory "$root\$($service.Name)" -WindowStyle Minimized
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "LearnHub Backend da san sang! Gateway: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Frontend: Mo terminal moi -> cd web -> npm run dev -> http://localhost:5173" -ForegroundColor Cyan
