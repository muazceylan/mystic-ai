# ============================================================
# Mystic AI — Windows Servis Baslat
# Ilk kurulum icin setup.ps1 kullanin.
# Bu script: altyapi hazırsa servisleri (yeniden) baslatir.
# Kullanim: .\start-services.ps1
#           .\start-services.ps1 -SkipBuild    # Build yapmadan
# ============================================================
#Requires -Version 5.1
[CmdletBinding()]
param([switch]$SkipBuild)

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot
Set-Location $ROOT

function Write-Step { param($msg) Write-Host "`n🔹 $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "     $msg" -ForegroundColor Gray }

function Test-Port {
    param([int]$Port, [int]$TimeoutMs = 500)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $r = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $ok = $r.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        $tcp.Close(); return $ok
    } catch { return $false }
}

function Wait-Port {
    param([int]$Port, [int]$TimeoutSecs = 90, [string]$Name = "servis")
    Write-Info "Bekleniyor: $Name :$Port ..."
    for ($i = 1; $i -le $TimeoutSecs; $i++) {
        if (Test-Port $Port) { Write-OK "$Name :$Port hazir"; return $true }
        Start-Sleep 1
    }
    Write-Fail "$Name $TimeoutSecs saniye icinde baslamadi"
    return $false
}

# ── Altyapi portlari kontrol ──────────────────────────────────
Write-Step "Altyapi portlari kontrol ediliyor"
$missing = @()
foreach ($p in @(5432, 5672, 6379)) {
    if (-not (Test-Port $p)) { $missing += $p }
}
if ($missing.Count -gt 0) {
    Write-Fail "Asagidaki portlar acik degil: $($missing -join ', ')"
    Write-Info "Once altyapiyi baslatin: docker compose up -d postgres rabbitmq redis mailhog"
    exit 1
}
Write-OK "Altyapi portlari hazir (5432, 5672, 6379)"

# ── Build ─────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Step "Maven build"
    mvn clean install -DskipTests -q
    if ($LASTEXITCODE -ne 0) { Write-Fail "Build basarisiz"; exit 1 }
    Write-OK "Build tamamlandi"
}

# ── Ortam degiskenleri ────────────────────────────────────────
Write-Step "Ortam degiskenleri yukleniyor"
if (Test-Path "$ROOT\.env") {
    Get-Content "$ROOT\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
        }
    }
}
$env:JPA_DDL_AUTO = "update"
Write-OK "JPA_DDL_AUTO=update"

# ── Eski servisleri durdur ────────────────────────────────────
Write-Step "Onceki servisler durduruluyor"
$jars = @("service-registry","auth-service","ai-orchestrator","astrology-service",
          "numerology-service","dream-service","oracle-service","notification-service",
          "vision-service","spiritual-service","api-gateway")
foreach ($jar in $jars) {
    Get-Process "java" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*$jar*" } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}
Start-Sleep 2

# ── Log dizini ────────────────────────────────────────────────
$LOG_DIR = "$ROOT\logs"
New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null

# ── Servis baslat fonksiyon ────────────────────────────────────
function Start-JavaService {
    param([string]$Tag, [string]$JarPattern, [string]$ExtraArgs = "")
    $jar = Get-ChildItem -Path "$ROOT" -Filter $JarPattern -Recurse -ErrorAction SilentlyContinue |
           Where-Object { $_.FullName -notlike "*\test-*" } | Select-Object -First 1
    if (-not $jar) { Write-Fail "JAR bulunamadi: $JarPattern"; return }
    $log = "$LOG_DIR\$Tag.log"
    $cmd = "java -jar `"$($jar.FullName)`" $ExtraArgs *> `"$log`""
    $proc = Start-Process powershell -ArgumentList "-NoProfile -Command $cmd" -PassThru -WindowStyle Hidden
    $proc.Id | Out-File "$LOG_DIR\$Tag.pid" -Encoding ascii
    Write-Info "▶ $Tag  PID=$($proc.Id)  →  $log"
}

# ── Servisleri sirayla baslat ─────────────────────────────────
Write-Step "Servisler baslatiliyor"

Start-JavaService "eureka"       "service-registry-*.jar"
if (-not (Wait-Port 8761 60 "Eureka")) { exit 1 }

Start-JavaService "auth"         "auth-service-*.jar"
if (-not (Wait-Port 8081 90 "auth-service")) {
    Write-Info "Cozum icin: netstat -ano | findstr :8081"
    exit 1
}

Start-JavaService "ai-orchestrator" "ai-orchestrator-*.jar"
Start-JavaService "astrology"       "astrology-service-*.jar"
Start-JavaService "numerology"      "numerology-service-*.jar"
Start-JavaService "dream"           "dream-service-*.jar"
Start-JavaService "oracle"          "oracle-service-*.jar"
Start-JavaService "notification"    "notification-service-*.jar" "--spring.profiles.active=local"
Start-JavaService "vision"          "vision-service-*.jar"
Start-JavaService "spiritual"       "spiritual-service-*.jar"    "--spring.profiles.active=local"
Start-JavaService "gateway"         "api-gateway-*.jar"          "--spring.profiles.active=local"

if (-not (Wait-Port 8080 90 "api-gateway")) { exit 1 }

# ── Saglik kontrolu ───────────────────────────────────────────
Start-Sleep 3
try {
    $r = Invoke-WebRequest "http://localhost:8080/api/v1/auth/check-email?email=startup-check@mystic.ai" `
                           -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200) { Write-OK "Gateway saglik kontrolu gecti" }
} catch {
    Write-Warn "Gateway saglik kontrolu: $_ (servisler hala basliyor olabilir)"
}

Write-Host ""
Write-Host "  ✅ Servisler calisiyor. Loglar: $LOG_DIR" -ForegroundColor Green
Write-Host "  Gateway:  http://localhost:8080" -ForegroundColor Gray
Write-Host "  Eureka:   http://localhost:8761" -ForegroundColor Gray
Write-Host "  Swagger:  http://localhost:8080/swagger-ui.html" -ForegroundColor Gray
Write-Host "  MailHog:  http://localhost:8025" -ForegroundColor Gray
Write-Host "  RabbitMQ: http://localhost:15672" -ForegroundColor Gray
Write-Host ""
