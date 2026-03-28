# ============================================================
# Mystic AI — Windows Ilk Kurulum Scripti
# PowerShell 5.1+ veya PowerShell 7+ gerektirir
# Kullanim: PowerShell'i Yonetici olarak ac, repo kokuyle calistir:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
#   .\setup.ps1
# ============================================================
#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$InfraOnly,
    [switch]$NoServices
)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Mystic AI Setup"

$ROOT = $PSScriptRoot
Set-Location $ROOT

# ── Renk yardimcilari ─────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n🔹 $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-Info  { param($msg) Write-Host "     $msg" -ForegroundColor Gray }

# ── Port kontrol ──────────────────────────────────────────────
function Test-Port {
    param([int]$Port, [int]$TimeoutMs = 500)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $result = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $result.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        $tcp.Close()
        return $wait
    } catch { return $false }
}

function Wait-Port {
    param([int]$Port, [int]$TimeoutSecs = 90, [string]$Name = "servis")
    Write-Info "Bekleniyor: $Name :$Port ..."
    for ($i = 1; $i -le $TimeoutSecs; $i++) {
        if (Test-Port $Port) { Write-OK "$Name :$Port hazir"; return $true }
        Start-Sleep 1
    }
    Write-Fail "$Name $TimeoutSecs saniye icinde :$Port portunu actmadi"
    return $false
}

# ── Komut varligi kontrol ────────────────────────────────────
function Assert-Command {
    param([string]$Cmd, [string]$InstallHint)
    if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
        Write-Fail "'$Cmd' bulunamadi."
        Write-Info "Kurulum: $InstallHint"
        exit 1
    }
}

# ============================================================
# ADIM 1 — Gereksinimler
# ============================================================
Write-Step "Gereksinim kontrolu"

Assert-Command "java"   "https://adoptium.net  (Java 21 LTS secin)"
Assert-Command "mvn"    "https://maven.apache.org/download.cgi  (PATH'e ekleyin)"
Assert-Command "node"   "https://nodejs.org  (LTS surumu)"
Assert-Command "npm"    "Node.js ile gelir"
Assert-Command "docker" "https://www.docker.com/products/docker-desktop"

# Java versiyonu kontrol (21+)
$javaVer = (java -version 2>&1 | Select-String "version" | Out-String)
if ($javaVer -match '"(\d+)') {
    $major = [int]$Matches[1]
    if ($major -lt 21) {
        Write-Fail "Java 21+ gerekli. Mevcut: $javaVer"
        Write-Info "https://adoptium.net adresinden Java 21 indirin"
        exit 1
    }
    Write-OK "Java $major"
}

# Node versiyonu kontrol (20+)
$nodeVer = (node --version 2>&1).TrimStart('v')
$nodeMaj = [int]($nodeVer.Split('.')[0])
if ($nodeMaj -lt 20) {
    Write-Fail "Node.js 20+ gerekli. Mevcut: $nodeVer"
    Write-Info "https://nodejs.org adresinden LTS surumu indirin"
    exit 1
}
Write-OK "Node.js $nodeVer"

# pnpm kontrol (admin panel icin)
if (-not (Get-Command "pnpm" -ErrorAction SilentlyContinue)) {
    Write-Warn "pnpm bulunamadi — admin panel icin kuruluyor..."
    npm install -g pnpm
}
Write-OK "pnpm $(pnpm --version)"

# Docker Desktop calisma kontrol
$dockerOk = docker info 2>&1 | Select-String "Server Version"
if (-not $dockerOk) {
    Write-Fail "Docker Desktop calismıyor."
    Write-Info "Docker Desktop'i baslatip tekrar deneyin."
    exit 1
}
Write-OK "Docker calisiyor"

# ============================================================
# ADIM 2 — Env dosyalari
# ============================================================
Write-Step "Ortam dosyalari hazirlaniyor"

if (-not (Test-Path "$ROOT\.env")) {
    Copy-Item "$ROOT\.env.example" "$ROOT\.env"
    Write-OK ".env olusturuldu (.env.example'dan)"
    Write-Warn "Gerekirse .env icindeki API anahtarlarini (OPENAI_API_KEY vb.) doldurun"
} else {
    Write-OK ".env zaten mevcut"
}

if (-not (Test-Path "$ROOT\mysticai-mobile\.env")) {
    Copy-Item "$ROOT\mysticai-mobile\.env.example" "$ROOT\mysticai-mobile\.env"
    Write-OK "mysticai-mobile\.env olusturuldu"
} else {
    Write-OK "mysticai-mobile\.env zaten mevcut"
}

# ============================================================
# ADIM 3 — Docker altyapisi
# ============================================================
Write-Step "Docker altyapisi baslatiliyor (PostgreSQL, RabbitMQ, Redis, MailHog)"

Set-Location $ROOT
docker compose up -d postgres rabbitmq redis mailhog

Write-Info "Altyapilar saglıklı olana kadar bekleniyor..."

if (-not (Wait-Port 5432 60 "PostgreSQL"))  { exit 1 }
if (-not (Wait-Port 5672 60 "RabbitMQ"))   { exit 1 }
if (-not (Wait-Port 6379 60 "Redis"))       { exit 1 }
Write-OK "Tum altyapi portlari hazir"

if ($InfraOnly) {
    Write-Host "`n✅ Altyapi baslatildi. Servisler icin tekrar calistirin (--InfraOnly olmadan)." -ForegroundColor Green
    exit 0
}

# ============================================================
# ADIM 4 — Maven build
# ============================================================
if (-not $SkipBuild) {
    Write-Step "Maven build (testler atlanıyor, ~3-5 dk)"
    Set-Location $ROOT
    mvn clean install -DskipTests -q
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Maven build basarisiz!"
        Write-Info "Hata detayi icin: mvn clean install -DskipTests"
        exit 1
    }
    Write-OK "Build tamamlandi"
} else {
    Write-Warn "Build atlandi (--SkipBuild)"
}

if ($NoServices) {
    Write-Host "`n✅ Build tamamlandi. Servisleri baslatmak icin: .\start-services.ps1" -ForegroundColor Green
    exit 0
}

# ============================================================
# ADIM 5 — Calisان servisleri durdur
# ============================================================
Write-Step "Varsa onceki Java servisleri durduruluyor"

$serviceJars = @(
    "service-registry", "auth-service", "ai-orchestrator",
    "astrology-service", "numerology-service", "dream-service",
    "oracle-service", "notification-service", "vision-service",
    "spiritual-service", "api-gateway"
)
foreach ($jar in $serviceJars) {
    Get-Process -Name "java" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*$jar*" } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}
Start-Sleep 2
Write-OK "Temizlik tamamlandi"

# ============================================================
# ADIM 6 — Ortam degiskenleri ayarla
# ============================================================
Write-Step "Ortam degiskenleri ayarlaniyor"

# .env dosyasini oku ve process'e aktar
Get-Content "$ROOT\.env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key   = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Yerel gelistirme icin DDL modunu update yap
$env:JPA_DDL_AUTO = "update"
Write-OK "JPA_DDL_AUTO=update (Hibernate tum tablolari otomatik olusturur)"

# ============================================================
# ADIM 7 — Log dizini hazirla
# ============================================================
$LOG_DIR = "$ROOT\logs"
New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
Write-OK "Log dizini: $LOG_DIR"

# ============================================================
# ADIM 8 — Servisleri arka planda baslat
# ============================================================
Write-Step "Java servisleri baslatiliyor"

function Start-JavaService {
    param([string]$Tag, [string]$JarPattern, [string]$ExtraArgs = "")
    $jar = Get-ChildItem -Path $ROOT -Filter $JarPattern -Recurse -ErrorAction SilentlyContinue |
           Where-Object { $_.FullName -notlike "*\test-*" } |
           Select-Object -First 1
    if (-not $jar) {
        Write-Fail "JAR bulunamadi: $JarPattern"
        return $null
    }
    $logFile = "$LOG_DIR\$Tag.log"
    $cmd = "java -jar `"$($jar.FullName)`" $ExtraArgs *> `"$logFile`""
    $proc = Start-Process powershell -ArgumentList "-NoProfile -Command $cmd" -PassThru -WindowStyle Hidden
    Write-Info "▶ $Tag baslatildi (PID=$($proc.Id)) → $logFile"
    return $proc
}

# Eureka Service Registry
$eurekaPid = Start-JavaService "eureka" "service-registry-*.jar"
if (-not (Wait-Port 8761 60 "Eureka")) {
    Write-Fail "Eureka baslamadiı. Log: $LOG_DIR\eureka.log"
    exit 1
}

# Auth Service
$authPid = Start-JavaService "auth" "auth-service-*.jar"
if (-not (Wait-Port 8081 90 "auth-service")) {
    Write-Fail "Auth service baslamadi. Log: $LOG_DIR\auth.log"
    Write-Info "Sikca karsilasilan sorun: '8081 already in use'"
    Write-Info "Cozum: netstat -ano | findstr :8081  sonra  taskkill /PID <pid> /F"
    exit 1
}

# Diger servisler (paralel)
Start-JavaService "ai-orchestrator" "ai-orchestrator-*.jar"    | Out-Null
Start-JavaService "astrology"       "astrology-service-*.jar"  | Out-Null
Start-JavaService "numerology"      "numerology-service-*.jar" | Out-Null
Start-JavaService "dream"           "dream-service-*.jar"      | Out-Null
Start-JavaService "oracle"          "oracle-service-*.jar"     | Out-Null
Start-JavaService "notification"    "notification-service-*.jar" "--spring.profiles.active=local" | Out-Null
Start-JavaService "vision"          "vision-service-*.jar"     | Out-Null
Start-JavaService "spiritual"       "spiritual-service-*.jar"  "--spring.profiles.active=local" | Out-Null

# API Gateway — en son basla
Start-JavaService "gateway" "api-gateway-*.jar" "--spring.profiles.active=local" | Out-Null
if (-not (Wait-Port 8080 90 "api-gateway")) {
    Write-Fail "API Gateway baslamadi. Log: $LOG_DIR\gateway.log"
    exit 1
}

# ============================================================
# ADIM 9 — Gateway saglik kontrolu
# ============================================================
Write-Step "Gateway dogrulaniyor"
Start-Sleep 3

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/auth/check-email?email=startup-check@mystic.ai" `
                               -UseBasicParsing -TimeoutSec 10
    if ($resp.StatusCode -eq 200) {
        Write-OK "Gateway → auth-service rotasi calisıyor"
    } else {
        Write-Warn "Gateway yanit verdi fakat HTTP $($resp.StatusCode)"
    }
} catch {
    Write-Warn "Gateway saglik kontrolu basarisiz: $_"
    Write-Info "Servisler hala basliyor olabilir, 1-2 dk bekleyin"
}

# ============================================================
# OZET
# ============================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host "  ✨ Mystic AI — Kurulum Tamamlandi!" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  Backend Servisleri:" -ForegroundColor White
Write-Host "    API Gateway  → http://localhost:8080" -ForegroundColor Gray
Write-Host "    Swagger UI   → http://localhost:8080/swagger-ui.html" -ForegroundColor Gray
Write-Host "    Eureka       → http://localhost:8761" -ForegroundColor Gray
Write-Host ""
Write-Host "  Altyapi Panelleri:" -ForegroundColor White
Write-Host "    MailHog      → http://localhost:8025" -ForegroundColor Gray
Write-Host "    RabbitMQ     → http://localhost:15672  (mystic / mystic123)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Loglar: $LOG_DIR" -ForegroundColor Gray
Write-Host ""
Write-Host "  Sonraki adimlar:" -ForegroundColor White
Write-Host "    Admin Panel  →  cd mystic-admin  &&  pnpm install  &&  pnpm dev" -ForegroundColor DarkYellow
Write-Host "    Mobil        →  cd mysticai-mobile  &&  npm install  &&  npm start" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "  Ipucu: Servisleri tekrar baslatmak icin: .\start-services.ps1" -ForegroundColor DarkGray
Write-Host ""
