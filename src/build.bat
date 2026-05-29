@echo off
cd /d "%~dp0"
echo Installing build dependencies...
python -m pip install -q pywebview pythonnet pyinstaller pillow rjsmin pystray
echo.
echo Creating application icon...
python create_icon.py
echo.
echo Bundling app into one HTML file...
python bundle.py
if not exist "app.html" (
  echo ERROR: app.html was not created.
  exit /b 1
)
if not exist "app.bundle.js" (
  echo ERROR: app.bundle.js was not created.
  exit /b 1
)
echo.
echo Building Planer (single EXE)...
tasklist /FI "IMAGENAME eq Planer.exe" 2>nul | find /I "Planer.exe" >nul
if not errorlevel 1 (
  echo ERROR: Planer.exe is running. Close it before rebuilding.
  exit /b 1
)
python -m PyInstaller --noconfirm --clean --onefile --windowed --name Planer ^
  --icon "%~dp0planner.ico" ^
  --optimize=2 ^
  --add-data "app.html;." ^
  --add-data "app.bundle.js;." ^
  --add-data "planner.ico;." ^
  --add-data "..\LICENSE;." ^
  --noupx ^
  --exclude-module numpy ^
  --exclude-module PIL ^
  --exclude-module pandas ^
  --exclude-module matplotlib ^
  --exclude-module scipy ^
  --exclude-module pytest ^
  --exclude-module pygments ^
  --exclude-module jinja2 ^
  --exclude-module mako ^
  --exclude-module pydoc ^
  --exclude-module doctest ^
  --exclude-module unittest ^
  --exclude-module tkinter ^
  --exclude-module _tkinter ^
  --exclude-module turtle ^
  --exclude-module curses ^
  --hidden-import pythonnet ^
  --hidden-import clr_loader ^
  --hidden-import pystray ^
  launcher.py
if not exist "dist\Planer.exe" (
  echo Build failed.
  exit /b 1
)
move /Y "dist\Planer.exe" "..\Planer.exe" >nul
if errorlevel 1 (
  echo ERROR: Could not replace ..\Planer.exe. Close Planer and rebuild.
  exit /b 1
)
if exist "..\_internal" rmdir /s /q "..\_internal"
rmdir /s /q build dist 2>nul
del /q app.html app.bundle.js Planer.spec 2>nul
echo.
echo Done: ..\Planer.exe
