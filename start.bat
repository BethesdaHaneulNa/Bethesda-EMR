@echo off
title Bethesda EMR
color 0B
echo ==================================================
echo    Bethesda EMR
echo ==================================================
echo.

REM --- 1) Is Docker running? ---
docker info >nul 2>&1
if errorlevel 1 (
  color 0E
  echo  [!] Docker Desktop is not running yet.
  echo.
  echo      1. Open "Docker Desktop" from the Start menu.
  echo      2. Wait until it says "Engine running" ^(the whale icon stops moving^).
  echo      3. Double-click this start file again.
  echo.
  echo      ^(If Docker Desktop is not installed, install it first from
  echo       https://www.docker.com/products/docker-desktop ^)
  echo.
  pause
  exit /b 1
)

echo  Starting Bethesda EMR...
echo  The first time, this downloads and builds everything and can take
echo  a few minutes. Please wait - do not close this window.
echo.

REM --- 2) Generate secrets (first run) and start everything ---
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if errorlevel 1 (
  color 0C
  echo.
  echo  [!] Something went wrong while starting. Please share this window's
  echo      text for help.
  echo.
  pause
  exit /b 1
)

REM --- 3) Open the app in the browser ---
echo.
echo  Opening Bethesda EMR in your web browser...
timeout /t 4 >nul
start "" http://localhost:9080

color 0A
echo.
echo ==================================================
echo    Bethesda EMR is running:  http://localhost:9080
echo.
echo    The first screen asks you to create your
echo    administrator account. After that, add your
echo    staff in Settings.
echo.
echo    If the page looks blank, wait a few seconds and
echo    refresh the browser.
echo ==================================================
echo.
echo  You can close this window now.
pause >nul
