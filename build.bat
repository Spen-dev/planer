@echo off
cd /d "%~dp0"
echo Installing build dependencies...
python -m pip install -q pywebview pyinstaller
echo.
echo Bundling app into one HTML file...
python bundle.py
echo.
echo Building single Planer.exe...
python -m PyInstaller --noconfirm --clean --onefile --windowed --name Planer ^
  --add-data "app.html;." ^
  --exclude-module numpy ^
  --exclude-module PIL ^
  --exclude-module pandas ^
  --exclude-module matplotlib ^
  --exclude-module scipy ^
  --exclude-module pytest ^
  launcher.py
if not exist "dist\Planer.exe" (
  echo Build failed.
  exit /b 1
)
move /Y "dist\Planer.exe" "Planer.exe" >nul
rmdir /s /q build dist 2>nul
del /q app.html Planer.spec 2>nul
echo.
echo Done: Planer.exe
echo You only need this one file to run the app.
