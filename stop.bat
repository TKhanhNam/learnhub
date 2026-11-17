@echo off
chcp 65001 > nul
echo ===================================================
echo     DANG DUNG HE THONG LEARNHUB...
echo ===================================================

echo [1/2] Dung tat ca cac service Java Backend...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\stop-all.ps1"

echo [2/2] Dung Frontend Vite (neu co)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /f /pid %%a > nul 2>&1

echo ===================================================
echo   DA DUNG TOAN BO HE THONG LEARNHUB THANH CONG!
echo ===================================================
pause
