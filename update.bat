@echo off
REM Double-click this on Windows to update Bethesda EMR (backup -> latest -> rebuild -> verify).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1"
echo.
pause
