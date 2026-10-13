# path: scripts/stop-all.ps1
# purpose: dung toan bo service backend Java dang chay tren may

Write-Host "Dang dung cac backend service LearnHub..." -ForegroundColor Yellow
$javaProcesses = Get-Process -Name java -ErrorAction SilentlyContinue
if ($javaProcesses) {
    $javaProcesses | Stop-Process -Force
    Write-Host "Da dung $($javaProcesses.Count) tien trinh Java thanh cong." -ForegroundColor Green
} else {
    Write-Host "Khong co tien trinh Java nao dang chay." -ForegroundColor Cyan
}
