@echo off
rem Bethesda EMR - puts the shortcut "Bethesda EMR" on this PC's desktop (asks for the server's address).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0desktop-shortcut.ps1" -Ask
pause
