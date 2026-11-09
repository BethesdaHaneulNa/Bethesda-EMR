@echo off
REM Bethesda EMR - server status window.
REM
REM Double-click this to see whether the system is working. Leave it open on the
REM machine that runs the clinic; it re-checks by itself every 15 seconds.
REM
REM Change fr to en or ko below for a different starting language (the window
REM also has a button to switch).

start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0server-status.ps1" -Lang fr
