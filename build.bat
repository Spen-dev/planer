@echo off
cd /d "%~dp0"
echo Installing build dependencies...
python -m pip install -q pywebview pyinstaller
echo.
echo Building Planer.exe...
python -m PyInstaller --noconfirm --onefile --windowed --name Planer ^
  --add-data "index.html;." ^
  --add-data "styles.css;." ^
  --add-data "app.js;." ^
  launcher.py
echo.
if exist "dist\Planer.exe" (
  echo Done: dist\Planer.exe
) else (
  echo Build failed.
  exit /b 1
)
