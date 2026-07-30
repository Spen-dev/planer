$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$KeyDir = Join-Path $Root "keystore"
$Keystore = Join-Path $KeyDir "planer-release.jks"
$Props = Join-Path $Root "keystore.properties"

if (Test-Path $Keystore) {
    Write-Host "Keystore already exists: $Keystore"
    if (-not (Test-Path $Props)) {
        Write-Host "Missing keystore.properties - copy keystore.properties.example and fill passwords."
    }
    exit 0
}

$javaHome = $env:JAVA_HOME
if (-not $javaHome) {
    $javaHome = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
}
$keytool = Join-Path $javaHome "bin\keytool.exe"
if (-not (Test-Path $keytool)) {
    throw "keytool not found. Set JAVA_HOME or install JDK 17."
}

$password = if ($env:PLANER_KEYSTORE_PASSWORD) { $env:PLANER_KEYSTORE_PASSWORD } else { "planer-change-me" }

New-Item -ItemType Directory -Force -Path $KeyDir | Out-Null

& $keytool -genkeypair -v `
    -storetype JKS `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $password `
    -keypass $password `
    -alias planer `
    -keystore $Keystore `
    -dname "CN=Planer, OU=Mobile, O=Spen, L=Unknown, ST=Unknown, C=RU"

@"
storeFile=keystore/planer-release.jks
storePassword=$password
keyAlias=planer
keyPassword=$password
"@ | Set-Content -Path $Props -Encoding Ascii

Write-Host "Created: $Keystore"
Write-Host "Created: $Props"
Write-Host "Default password: $password (set PLANER_KEYSTORE_PASSWORD to override)"
