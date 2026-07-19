@echo off
setlocal
cd /d "%~dp0"
if not exist "gradlew.bat" (
  echo Missing gradlew.bat. Open this folder in Android Studio first.
  exit /b 1
)
call gradlew.bat assembleDebug --no-daemon
if errorlevel 1 exit /b 1
set "APK=app\build\outputs\apk\debug\app-debug.apk"
if not exist "%APK%" (
  echo APK not found: %APK%
  exit /b 1
)
copy /Y "%APK%" "..\Planer.apk" >nul
echo Built: %CD%\..\Planer.apk
endlocal
