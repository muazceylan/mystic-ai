# Mystic backend JAR'larini tutan java/javaw sureclerini durdurur (Windows).
# Kullanim:
#   .\scripts\stop-backend-jars.ps1
#   .\scripts\stop-backend-jars.ps1 -ForceAllJava   # TUM java/javaw (IDE dahil) - DIKKAT
#   .\scripts\stop-backend-jars.ps1 -Verbose        # Eslesmeyen java satirlarini listele
param(
    [switch]$ForceAllJava,
    [switch]$Verbose
)
$ErrorActionPreference = "Continue"
$jars = @(
    "service-registry", "auth-service", "ai-orchestrator",
    "astrology-service", "numerology-service", "dream-service",
    "oracle-service", "notification-service", "vision-service",
    "spiritual-service", "api-gateway"
)

function Test-MysticBackendCommandLine {
    param([string]$CommandLine)
    if (-not $CommandLine) { return $false }
    foreach ($jar in $jars) {
        if ($CommandLine -like "*$jar*") { return $true }
    }
    return $false
}

$killed = 0

if ($ForceAllJava) {
    Write-Warning "ForceAllJava: Tum java.exe ve javaw.exe surecleri kapatiliyor (IDE, Gradle vb. dahil)."
    foreach ($n in @("java", "javaw")) {
        Get-Process -Name $n -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "[stop] PID $($_.Id) ($n.exe) ForceAllJava"
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            $killed++
        }
    }
} else {
    # WMI: Name filtresi bazen kaciriyor; tum Win32_Process uzerinden java/javaw sec
    $all = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match '^(java|javaw)\.exe$'
    }
    foreach ($p in $all) {
        if (Test-MysticBackendCommandLine $p.CommandLine) {
            Write-Host "[stop] PID $($p.ProcessId) $($p.Name) :: $($p.CommandLine.Substring(0, [Math]::Min(160, $p.CommandLine.Length)))..."
            Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
            $killed++
        } elseif ($Verbose -and $p.CommandLine) {
            Write-Host "[skip] PID $($p.ProcessId) :: $($p.CommandLine.Substring(0, [Math]::Min(120, $p.CommandLine.Length)))..."
        }
    }
}

if ($killed -gt 0) {
    Start-Sleep -Seconds 2
}
Write-Host "Done ($killed process(es) stopped)."
