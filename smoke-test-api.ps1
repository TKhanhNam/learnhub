# LearnHub API smoke test via Vite proxy (http://localhost:5173)
# Does not modify application code. Timeout per request: 8s.

$ErrorActionPreference = 'Continue'
$BaseUrl = 'http://localhost:5173'
$TimeoutSec = 8
$Results = [System.Collections.Generic.List[object]]::new()

function Get-ErrorMessage {
    param($ResponseBody, $Exception)
    if ($ResponseBody) {
        try {
            $j = $ResponseBody | ConvertFrom-Json -ErrorAction Stop
            if ($j.message) { return [string]$j.message }
            if ($j.error) { return [string]$j.error }
            if ($j.data -and $j.data.message) { return [string]$j.data.message }
            $s = ($ResponseBody -replace '\s+', ' ').Trim()
            if ($s.Length -gt 180) { return $s.Substring(0, 180) + '...' }
            return $s
        } catch {
            $s = ([string]$ResponseBody -replace '\s+', ' ').Trim()
            if ($s.Length -gt 180) { return $s.Substring(0, 180) + '...' }
            return $s
        }
    }
    if ($Exception) {
        if ($Exception.InnerException) { return $Exception.InnerException.Message }
        return $Exception.Message
    }
    return ''
}

function Invoke-Api {
    param(
        [string]$Role,
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [switch]$ReturnData
    )

    $uri = if ($Path.StartsWith('http')) { $Path } else { "$BaseUrl$Path" }
    $status = 0
    $success = $false
    $err = ''
    $parsed = $null
    $raw = $null

    try {
        $params = @{
            Uri             = $uri
            Method          = $Method
            Headers         = $Headers
            TimeoutSec      = $TimeoutSec
            UseBasicParsing = $true
        }
        if ($null -ne $Body) {
            $params.ContentType = 'application/json; charset=utf-8'
            $params.Body = if ($Body -is [string]) { $Body } else { ($Body | ConvertTo-Json -Compress -Depth 8) }
        }
        $resp = Invoke-WebRequest @params
        $status = [int]$resp.StatusCode
        $raw = $resp.Content
        $success = ($status -ge 200 -and $status -lt 300)
        try { $parsed = $raw | ConvertFrom-Json } catch { $parsed = $null }
        if (-not $success) { $err = Get-ErrorMessage -ResponseBody $raw }
    }
    catch {
        $ex = $_.Exception
        $respObj = $_.Exception.Response
        if ($respObj) {
            try { $status = [int]$respObj.StatusCode } catch { $status = 0 }
            try {
                $stream = $respObj.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $raw = $reader.ReadToEnd()
                    $reader.Close()
                }
            } catch { }
            $err = Get-ErrorMessage -ResponseBody $raw -Exception $ex
            try { $parsed = $raw | ConvertFrom-Json } catch { $parsed = $null }
        }
        else {
            $status = 0
            $err = Get-ErrorMessage -Exception $ex
            if ($err -match 'timed out|timeout|The operation has timed out') {
                $err = "Timeout after ${TimeoutSec}s"
            }
        }
        $success = $false
    }

    $row = [pscustomobject]@{
        Role    = $Role
        Method  = $Method.ToUpper()
        Path    = $Path
        Status  = $status
        Success = $success
        Error   = $err
    }
    $Results.Add($row) | Out-Null

    $flag = if ($success) { 'PASS' } else { 'FAIL' }
    $msg = if ($err) { " | $err" } else { '' }
    Write-Host ("[{0}] {1,-8} {2,-6} {3,-55} {4}{5}" -f $flag, $Role, $Method.ToUpper(), $Path, $status, $msg)

    if ($ReturnData) {
        return @{ Row = $row; Data = $parsed; Raw = $raw }
    }
    return $row
}

function Get-BearerHeaders {
    param([string]$Token)
    return @{ Authorization = "Bearer $Token"; Accept = 'application/json' }
}

function Login-Role {
    param([string]$Role, [string]$Username, [string]$Password)
    $body = @{ username = $Username; password = $Password }
    $r = Invoke-Api -Role $Role -Method POST -Path '/api/auth/login' -Body $body -ReturnData
    $token = $null
    if ($r.Data) {
        if ($r.Data.data -and $r.Data.data.accessToken) { $token = [string]$r.Data.data.accessToken }
        elseif ($r.Data.accessToken) { $token = [string]$r.Data.accessToken }
    }
    return $token
}

Write-Host '=== LearnHub API smoke test ==='
Write-Host "Base: $BaseUrl | Timeout: ${TimeoutSec}s"
Write-Host ''

# ---- PUBLIC (no auth) ----
Write-Host '--- PUBLIC ---'
Invoke-Api -Role PUBLIC -Method GET -Path '/api/catalog/courses?size=5' | Out-Null
$best = Invoke-Api -Role PUBLIC -Method GET -Path '/api/catalog/best-sellers' -ReturnData
Invoke-Api -Role PUBLIC -Method GET -Path '/api/catalog/most-viewed?limit=7' | Out-Null
Invoke-Api -Role PUBLIC -Method GET -Path '/api/catalog/categories' | Out-Null
Invoke-Api -Role PUBLIC -Method GET -Path '/api/assist/help' | Out-Null
Invoke-Api -Role PUBLIC -Method GET -Path '/api/assist/help?locale=vi' | Out-Null

# Resolve a course slug / id for later student tests
$courseSlug = $null
$courseId = $null
$coursesProbe = Invoke-Api -Role PUBLIC -Method GET -Path '/api/catalog/courses?size=5' -ReturnData
$list = $null
if ($coursesProbe.Data -and $coursesProbe.Data.data) {
    $d = $coursesProbe.Data.data
    if ($d.content) { $list = $d.content }
    elseif ($d -is [System.Array]) { $list = $d }
    else { $list = @($d) }
}
if ($list -and $list.Count -gt 0) {
    $first = $list[0]
    $courseSlug = $first.slug
    $courseId = $first.id
    Write-Host "Using course slug=$courseSlug id=$courseId"
} else {
    Write-Host 'WARNING: no courses returned; student detail/cart POST may be skipped or fail'
}

Write-Host ''
Write-Host '--- STUDENT (student1) ---'
$studentToken = Login-Role -Role STUDENT -Username 'student1' -Password 'student123'
if ($studentToken) {
    $sh = Get-BearerHeaders -Token $studentToken
    Invoke-Api -Role STUDENT -Method GET -Path '/api/catalog/courses?size=5' -Headers $sh | Out-Null
    if ($courseSlug) {
        Invoke-Api -Role STUDENT -Method GET -Path "/api/catalog/courses/$courseSlug" -Headers $sh | Out-Null
    } else {
        Write-Host '[SKIP] STUDENT GET course detail (no slug)'
    }
    Invoke-Api -Role STUDENT -Method GET -Path '/api/learning/my-courses' -Headers $sh | Out-Null
    Invoke-Api -Role STUDENT -Method GET -Path '/api/commerce/cart' -Headers $sh | Out-Null
    Invoke-Api -Role STUDENT -Method GET -Path '/api/learning/certificates' -Headers $sh | Out-Null
    Invoke-Api -Role STUDENT -Method GET -Path '/api/users/me' -Headers $sh | Out-Null
    # alternate account path some apps use
    Invoke-Api -Role STUDENT -Method GET -Path '/api/account/me' -Headers $sh | Out-Null
    if ($courseId) {
        Invoke-Api -Role STUDENT -Method POST -Path '/api/commerce/cart' -Headers $sh -Body @{ courseId = $courseId } | Out-Null
    } else {
        Write-Host '[SKIP] STUDENT POST cart (no courseId)'
    }
    if ($courseId) {
        Invoke-Api -Role STUDENT -Method GET -Path "/api/learning/access/$courseId" -Headers $sh | Out-Null
    }
} else {
    Write-Host 'STUDENT login failed — skipping authenticated student calls'
}

Write-Host ''
Write-Host '--- INSTRUCTOR (teacher1) ---'
$teacherToken = Login-Role -Role INSTRUCTOR -Username 'teacher1' -Password 'teacher123'
if ($teacherToken) {
    $th = Get-BearerHeaders -Token $teacherToken
    $myCourses = Invoke-Api -Role INSTRUCTOR -Method GET -Path '/api/catalog/instructor/courses' -Headers $th -ReturnData
    Invoke-Api -Role INSTRUCTOR -Method GET -Path '/api/catalog/coupons' -Headers $th | Out-Null
    Invoke-Api -Role INSTRUCTOR -Method GET -Path '/api/commerce/instructor/payouts' -Headers $th | Out-Null
    Invoke-Api -Role INSTRUCTOR -Method GET -Path '/api/catalog/categories' -Headers $th | Out-Null

    $instructorCourseId = $null
    if ($myCourses.Data -and $myCourses.Data.data) {
        $cd = $myCourses.Data.data
        if ($cd.content -and $cd.content.Count -gt 0) { $instructorCourseId = $cd.content[0].id }
        elseif ($cd -is [System.Array] -and $cd.Count -gt 0) { $instructorCourseId = $cd[0].id }
        elseif ($cd.id) { $instructorCourseId = $cd.id }
    }
    if ($instructorCourseId) {
        Invoke-Api -Role INSTRUCTOR -Method GET -Path "/api/learning/instructor/submissions?courseId=$instructorCourseId" -Headers $th | Out-Null
        Invoke-Api -Role INSTRUCTOR -Method GET -Path "/api/learning/instructor/stats?courseIds=$instructorCourseId" -Headers $th | Out-Null
    } else {
        Write-Host '[SKIP] INSTRUCTOR studio submissions/stats (no instructor course id)'
    }
} else {
    Write-Host 'INSTRUCTOR login failed — teacher1 may be missing or password wrong'
}

Write-Host ''
Write-Host '--- ADMIN (admin) ---'
$adminToken = Login-Role -Role ADMIN -Username 'admin' -Password 'admin123'
if ($adminToken) {
    $ah = Get-BearerHeaders -Token $adminToken
    Invoke-Api -Role ADMIN -Method GET -Path '/api/catalog/admin/stats' -Headers $ah | Out-Null
    Invoke-Api -Role ADMIN -Method GET -Path '/api/catalog/admin/courses' -Headers $ah | Out-Null
    Invoke-Api -Role ADMIN -Method GET -Path '/api/users/admin/stats' -Headers $ah | Out-Null
    Invoke-Api -Role ADMIN -Method GET -Path '/api/users?size=20' -Headers $ah | Out-Null
    Invoke-Api -Role ADMIN -Method GET -Path '/api/users/admin/mail-log?size=10' -Headers $ah | Out-Null
    Invoke-Api -Role ADMIN -Method GET -Path '/api/commerce/admin/analytics' -Headers $ah | Out-Null
    Invoke-Api -Role ADMIN -Method GET -Path '/api/commerce/admin/orders?size=30' -Headers $ah | Out-Null
    Invoke-Api -Role ADMIN -Method GET -Path '/api/assist/ai-fee' -Headers $ah | Out-Null
} else {
    Write-Host 'ADMIN login failed — skipping authenticated admin calls'
}

Write-Host ''
Write-Host '=== SUMMARY ==='
$pass = @($Results | Where-Object { $_.Success })
$fail = @($Results | Where-Object { -not $_.Success })
Write-Host ("PASS: {0}  FAIL: {1}  TOTAL: {2}" -f $pass.Count, $fail.Count, $Results.Count)
Write-Host ''
Write-Host '--- PASS ---'
$pass | ForEach-Object { Write-Host ("  {0} {1} {2} -> {3}" -f $_.Role, $_.Method, $_.Path, $_.Status) }
Write-Host ''
Write-Host '--- FAIL ---'
if ($fail.Count -eq 0) {
    Write-Host '  (none)'
} else {
    $fail | ForEach-Object {
        Write-Host ("  {0} {1} {2} -> {3} | {4}" -f $_.Role, $_.Method, $_.Path, $_.Status, $_.Error)
    }
}

# Machine-readable JSON for report assembly
$outPath = Join-Path $PSScriptRoot 'smoke-test-results.json'
$Results | ConvertTo-Json -Depth 4 | Set-Content -Path $outPath -Encoding UTF8
Write-Host ''
Write-Host "Results written to $outPath"
