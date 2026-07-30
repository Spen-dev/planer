@echo off
setlocal
cd /d "%~dp0"

if not exist "keystore.properties" (
  echo keystore.properties not found. Creating release keystore...
  powershell -ExecutionPolicy Bypass -File "%~dp0create-keystore.ps1"
  if errorlevel 1 exit /b 1
)

if not exist "gradlew.bat" (
  echo Missing gradlew.bat
  exit /b 1
)

call gradlew.bat assembleRelease --no-daemon
if errorlevel 1 exit /b 1

set "APK=app\build\outputs\apk\release\app-release.apk"
if not exist "%APK%" (
  echo Release APK not found: %APK%
  exit /b 1
)

copy /Y "%APK%" "..\Planer-release.apk" >nul
echo Built: %CD%\..\Planer-release.apk
endlocal
