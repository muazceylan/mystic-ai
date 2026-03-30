# Maven'i PATH'teki `java` ile ayni JDK'ya (genelde 21) hizalayarak calistirir.
# Kullanim (repo kokunden):
#   .\scripts\mvn.ps1 clean install -DskipTests
#
# Not: Sistem JAVA_HOME JDK 17 iken `mvn` hata verebilir (release 21 not supported).
$ErrorActionPreference = "Stop"
$javaExe = (Get-Command java -ErrorAction Stop).Source
$javaHome = Split-Path -Parent (Split-Path -Parent $javaExe)
$env:JAVA_HOME = $javaHome
$binDir = Join-Path $javaHome "bin"
if ($env:Path -notlike "*${binDir}*") {
    $env:Path = "$binDir;$env:Path"
}
& mvn @args
exit $LASTEXITCODE
