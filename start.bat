@echo off
chcp 65001 > nul
echo ===================================================
echo     DANG KHOI DONG HE THONG LEARNHUB...
echo ===================================================

echo [1/3] Kiem tra MySQL...
sc query "MySQL80" | find "RUNNING" > nul
if errorlevel 1 (
    echo Dang bat dich vu MySQL80...
    net start MySQL80
) else (
    echo MySQL80 dang chay binh thuong.
)

echo [2/3] Khoi dong 10 Backend Microservices...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\run-all.ps1"

echo [3/3] Khoi dong Frontend Web (Port 5173)...
start "LearnHub Frontend" cmd /k "cd /d %~dp0web && npm run dev"

timeout /t 3 > nul
echo Mo trinh duyet...
start http://localhost:5173

echo ===================================================
echo   HE THONG DA SAN SANG!
echo   - Web App:    http://localhost:5173
echo   - Gateway:    http://localhost:8080
echo ===================================================
pause
