@echo off
cd /d "%~dp0"
echo Installing build dependencies...
python -m pip install -q pywebview pythonnet pyinstaller
echo.
echo Bundling app into one HTML file...
python bundle.py
echo.
echo Building Planer (fast onedir mode)...
python -m PyInstaller --noconfirm --clean --onedir --windowed --name Planer ^
  --optimize=2 ^
  --add-data "app.html;." ^
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
if not exist "dist\Planer\Planer.exe" (
  echo Build failed.
  exit /b 1
)
move /Y "dist\Planer\Planer.exe" "..\Planer.exe" >nul
if exist "..\_internal" rmdir /s /q "..\_internal"
move "dist\Planer\_internal" "..\_internal" >nul
rmdir /s /q build dist 2>nul
del /q app.html Planer.spec 2>nul
echo.
echo Done: ..\Planer.exe + ..\_internal\
