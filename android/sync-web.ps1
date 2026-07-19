$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Src = Join-Path $Root "src"
$Assets = Join-Path $PSScriptRoot "app\src\main\assets"

New-Item -ItemType Directory -Force -Path $Assets | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Assets "js") | Out-Null

Copy-Item (Join-Path $Src "index.html") (Join-Path $Assets "index.html") -Force
Copy-Item (Join-Path $Src "styles.css") (Join-Path $Assets "styles.css") -Force
Copy-Item (Join-Path $Src "mobile.css") (Join-Path $Assets "mobile.css") -Force

Get-ChildItem (Join-Path $Src "js\*.js") | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $Assets "js\$($_.Name)") -Force
}

$EulaSrc = Join-Path $Root "LICENSE"
if (Test-Path $EulaSrc) {
    Copy-Item $EulaSrc (Join-Path $Assets "eula.txt") -Force
}

Write-Host "Synced web assets to $Assets"
