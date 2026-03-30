# Maven build — JDK 21: scripts\mvn.ps1
# mvn clean: JAR kilitliyse: .\build.ps1 -StopJavaFirst clean install -DskipTests
# Hala olmazsa (IDE/Java LS): .\build.ps1 -StopJavaFirst -ForceKillAllJava clean install -DskipTests
param(
    [switch]$StopJavaFirst,
    [switch]$ForceKillAllJava,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$MavenArgs
)
if ($StopJavaFirst) {
    $stop = Join-Path $PSScriptRoot "scripts\stop-backend-jars.ps1"
    if ($ForceKillAllJava) {
        & $stop -ForceAllJava
    } else {
        & $stop
    }
}
$script = Join-Path $PSScriptRoot "scripts\mvn.ps1"
& $script @MavenArgs
exit $LASTEXITCODE
