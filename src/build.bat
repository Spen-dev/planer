@echo off
cd /d "%~dp0"
echo Installing build dependencies...
python -m pip install -q pywebview pythonnet pyinstaller pillow
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
echo.
echo Building Planer (single EXE)...
tasklist /FI "IMAGENAME eq Planer.exe" 2>nul | find /I "Planer.exe" >nul
if not errorlevel 1 (
  echo WARNING: Planer.exe is running. Close it before rebuilding.
)
python -m PyInstaller --noconfirm --clean --onefile --windowed --name Planer ^
  --icon "%~dp0planner.ico" ^
  --optimize=2 ^
  --add-data "app.html;." ^
  --add-data "planner.ico;." ^
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
  launcher.py
if not exist "dist\Planer.exe" (
  echo Build failed.
  exit /b 1
)
move /Y "dist\Planer.exe" "..\Planer.exe" >nul
if exist "..\_internal" rmdir /s /q "..\_internal"
rmdir /s /q build dist 2>nul
del /q app.html Planer.spec 2>nul
echo.
echo Done: ..\Planer.exe
