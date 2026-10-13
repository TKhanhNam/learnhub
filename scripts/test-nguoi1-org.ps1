# path: scripts/test-nguoi1-org.ps1
# purpose: kiem thu qua Gateway (8080) phan Nguoi 1 (gateway + identity) va org-service.
# Can chay: identity-service (8081), org-service (8087), api-gateway (8080).
# Test "cap khoa hoc cho nhan su" can them learning-service (8083) va catalog co khoa id = $CourseId.
#
#   powershell -ExecutionPolicy Bypass -File scripts\test-nguoi1-org.ps1

param(
    [string]$Base = "http://localhost:8080",
    [long]$CourseId = 1
)

$ErrorActionPreference = "Stop"
$script:pass = 0
$script:fail = 0

function Call {
    param([string]$Method, [string]$Path, $Body = $null, [string]$Token = $null)
    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $req = @{ Uri = "$Base$Path"; Method = $Method; Headers = $headers; UseBasicParsing = $true }
    if ($null -ne $Body) {
        $req["ContentType"] = "application/json; charset=utf-8"
        $req["Body"] = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 5 -Compress))
    }
    try {
        $r = Invoke-WebRequest @req
        $status = [int]$r.StatusCode
        $text = $r.Content
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if (-not $resp) { throw }
        $status = [int]$resp.StatusCode
        $text = (New-Object IO.StreamReader($resp.GetResponseStream())).ReadToEnd()
    }
    $json = $null
    try { $json = $text | ConvertFrom-Json } catch { }
    [pscustomobject]@{ Status = $status; Json = $json }
}

function Check {
    param([string]$Name, $Result, [int]$Expect)
    $msg = if ($Result.Json) { $Result.Json.message } else { "" }
    if ($Result.Status -eq $Expect) {
        $script:pass++
        Write-Host ("[PASS] {0} -> {1} {2}" -f $Name, $Result.Status, $msg) -ForegroundColor Green
    } else {
        $script:fail++
        Write-Host ("[FAIL] {0} -> {1} (mong doi {2}) {3}" -f $Name, $Result.Status, $Expect, $msg) -ForegroundColor Red
    }
}

function CheckCreated {
    param([string]$Name, $Result)
    $code = if ($Result.Json) { $Result.Json.code } else { $null }
    if ($Result.Status -lt 300 -and $code -eq 201) {
        $script:pass++
        Write-Host ("[PASS] {0} -> HTTP {1}, code {2} {3}" -f $Name, $Result.Status, $code, $Result.Json.message) -ForegroundColor Green
    } else {
        $script:fail++
        Write-Host ("[FAIL] {0} -> HTTP {1}, code {2} (mong doi code 201)" -f $Name, $Result.Status, $code) -ForegroundColor Red
    }
}

function Login([string]$User, [string]$Pass) {
    Call POST "/api/auth/login" @{ username = $User; password = $Pass; human = $true }
}

$suffix = Get-Date -Format "MMddHHmmss"
$newUser = "tester$suffix"

Write-Host "`n=== 1. GATEWAY ===" -ForegroundColor Cyan
Check "Goi API can dang nhap ma khong co token" (Call GET "/api/users/me") 401
Check "Goi duong dan /internal/ tu ngoai bi chan" (Call GET "/api/users/internal/abc") 403
Check "Route public GET /api/org/plans khong can token" (Call GET "/api/org/plans") 200

Write-Host "`n=== 2. DANG KY ===" -ForegroundColor Cyan
$reg = Call POST "/api/auth/register" @{ username = $newUser; email = "$newUser@test.vn"; fullName = "Nguoi Test"; password = "test123"; role = "STUDENT" }
Check "Dang ky hop le" $reg 201
Check "Dang ky trung username" (Call POST "/api/auth/register" @{ username = $newUser; email = "x$newUser@test.vn"; fullName = "A"; password = "test123" }) 409
Check "Dang ky sai email + mat khau ngan (validate)" (Call POST "/api/auth/register" @{ username = "ab$suffix"; email = "khong-phai-email"; fullName = "A"; password = "1" }) 400
Check "Tu dang ky vai tro ADMIN bi tu choi" (Call POST "/api/auth/register" @{ username = "hack$suffix"; email = "hack$suffix@test.vn"; fullName = "A"; password = "test123"; role = "ADMIN" }) 400
$newId = $reg.Json.data.userId
$newToken = $reg.Json.data.accessToken

Write-Host "`n=== 3. DANG NHAP + JWT ===" -ForegroundColor Cyan
Check "Dang nhap sai mat khau" (Login "student1" "sai-mat-khau") 401
Check "Dang nhap khong tick 'Toi la nguoi'" (Call POST "/api/auth/login" @{ username = "student1"; password = "student123" }) 400
$stu = Login "student1" "student123"
Check "Dang nhap student1" $stu 200
$stuToken = $stu.Json.data.accessToken
Check "GET /api/auth/me bang JWT" (Call GET "/api/auth/me" -Token $stuToken) 200
Check "Token gia mao bi tu choi" (Call GET "/api/users/me" -Token "abc.def.ghi") 401
Check "STUDENT goi API ADMIN bi cam" (Call GET "/api/users/admin/stats" -Token $stuToken) 403

$oldRefresh = $stu.Json.data.refreshToken
$ref = Call POST "/api/auth/refresh" @{ refreshToken = $oldRefresh }
Check "Refresh token cap access token moi" $ref 200
Check "Dung lai refresh token cu (da xoay vong) bi tu choi" (Call POST "/api/auth/refresh" @{ refreshToken = $oldRefresh }) 401
Check "Dang xuat" (Call POST "/api/auth/logout" @{ refreshToken = $ref.Json.data.refreshToken }) 200

Write-Host "`n=== 4. XAC THUC EMAIL ===" -ForegroundColor Cyan
$adm = Login "admin" "admin123"
Check "Dang nhap admin" $adm 200
$admToken = $adm.Json.data.accessToken
$verifyUrl = $reg.Json.data.devVerifyUrl
if (-not $verifyUrl) {
    $log = Call GET "/api/users/admin/mail-log?size=20" -Token $admToken
    $mail = $log.Json.data | Where-Object { $_.relatedUserId -eq $newId -and $_.body -match "verify-email\?token=" } | Select-Object -First 1
    if ($mail) { $verifyUrl = [regex]::Match($mail.body, "verify-email\?token=[^\s""<]+").Value }
}
if ($verifyUrl -match "token=([^&\s""<]+)") {
    $tk = $Matches[1]
    Check "Xac thuc email bang token" (Call GET "/api/auth/verify-email?token=$tk") 200
    $me = Call GET "/api/users/me" -Token $newToken
    if ($me.Json.data.emailVerified) { $script:pass++; Write-Host "[PASS] emailVerified = true" -ForegroundColor Green }
    else { $script:fail++; Write-Host "[FAIL] emailVerified van false" -ForegroundColor Red }
} else {
    Write-Host "[SKIP] Khong lay duoc link xac thuc (kiem tra hop thu that)" -ForegroundColor Yellow
}
Check "Token xac thuc sai" (Call GET "/api/auth/verify-email?token=sai-token") 400

Write-Host "`n=== 5. KHOA TAI KHOAN ===" -ForegroundColor Cyan
Check "Khoa voi ly do qua ngan (< 10 ky tu)" (Call PATCH "/api/users/$newId/lock" @{ locked = $true; reason = "ngan" } $admToken) 400
Check "Admin tu khoa chinh minh" (Call PATCH "/api/users/$($adm.Json.data.userId)/lock" @{ locked = $true; reason = "Tu khoa chinh minh" } $admToken) 400
Check "Admin khoa tai khoan moi" (Call PATCH "/api/users/$newId/lock" @{ locked = $true; reason = "Test khoa tai khoan" } $admToken) 200
Check "Tai khoan bi khoa khong dang nhap duoc" (Login $newUser "test123") 403
Check "Khoa xong refresh token cu bi thu hoi" (Call POST "/api/auth/refresh" @{ refreshToken = $reg.Json.data.refreshToken }) 401
Check "STUDENT khong duoc khoa nguoi khac" (Call PATCH "/api/users/$newId/lock" @{ locked = $false } $stuToken) 403
Check "Admin mo khoa" (Call PATCH "/api/users/$newId/lock" @{ locked = $false } $admToken) 200
Check "Dang nhap lai sau khi mo khoa" (Login $newUser "test123") 200

Write-Host "`n=== 6. ORG-SERVICE ===" -ForegroundColor Cyan
CheckCreated "Gui yeu cau dung thu khong can tai khoan" (Call POST "/api/org/demo-requests" @{ company = "Cong ty Test"; contactEmail = "hr@test.vn"; message = "Can 50 cho" })
Check "Demo request thieu email (validate)" (Call POST "/api/org/demo-requests" @{ company = "X" }) 400
Check "Admin xem danh sach demo request" (Call GET "/api/org/admin/demo-requests" -Token $admToken) 200

$org = Login "orgadmin" "org12345"
Check "Dang nhap orgadmin" $org 200
$orgToken = $org.Json.data.accessToken
Check "STUDENT goi API to chuc bi cam" (Call GET "/api/org/organizations/me" -Token $stuToken) 403

$mine = Call POST "/api/org/organizations" @{ name = "FPT Demo $suffix"; plan = "BUSINESS" } $orgToken
CheckCreated "Tao to chuc (goi BUSINESS)" $mine
$orgId = $mine.Json.data.id
Check "Tao to chuc thieu ten (validate)" (Call POST "/api/org/organizations" @{ name = "" } $orgToken) 400
Check "Xem to chuc cua toi" (Call GET "/api/org/organizations/me" -Token $orgToken) 200

CheckCreated "Them nhan su vao to chuc" (Call POST "/api/org/organizations/$orgId/members" @{ userId = $newId; role = "LEARNER" } $orgToken)
Check "Them trung nhan su" (Call POST "/api/org/organizations/$orgId/members" @{ userId = $newId } $orgToken) 409
Check "Danh sach nhan su" (Call GET "/api/org/organizations/$orgId/members" -Token $orgToken) 200
CheckCreated "Tao lo trinh hoc" (Call POST "/api/org/organizations/$orgId/paths" @{ title = "Lo trinh Java $suffix"; courseIds = @($CourseId) } $orgToken)
Check "Danh sach lo trinh" (Call GET "/api/org/organizations/$orgId/paths" -Token $orgToken) 200
$rep = Call GET "/api/org/organizations/$orgId/report" -Token $orgToken
Check "Bao cao to chuc" $rep 200
if ($rep.Json.data.members -eq 2 -and $rep.Json.data.paths -eq 1) { $script:pass++; Write-Host "[PASS] Bao cao dung: 2 thanh vien, 1 lo trinh" -ForegroundColor Green }
else { $script:fail++; Write-Host ("[FAIL] Bao cao: {0} thanh vien, {1} lo trinh" -f $rep.Json.data.members, $rep.Json.data.paths) -ForegroundColor Red }
Check "Admin he thong xem to chuc nguoi khac" (Call GET "/api/org/organizations/$orgId/report" -Token $admToken) 200
Check "To chuc khong ton tai" (Call GET "/api/org/organizations/999999/report" -Token $orgToken) 404
Check "Cap khoa cho nguoi khong thuoc to chuc" (Call POST "/api/org/organizations/$orgId/assign" @{ userId = 999999; courseId = $CourseId } $orgToken) 400
Check "Cap khoa cho nhan su (can learning-service)" (Call POST "/api/org/organizations/$orgId/assign" @{ userId = $newId; courseId = $CourseId } $orgToken) 200

$reg2 = Call POST "/api/auth/register" @{ username = "inst$suffix"; email = "inst$suffix@test.vn"; fullName = "GV Test"; password = "test123"; role = "INSTRUCTOR" }
Check "INSTRUCTOR goi API to chuc bi cam" (Call GET "/api/org/organizations/$orgId/members" -Token $reg2.Json.data.accessToken) 403

Write-Host ("`nKet qua: {0} PASS, {1} FAIL" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })
