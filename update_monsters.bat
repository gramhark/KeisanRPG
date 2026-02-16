@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\update_monsters.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo Error occurred.
    pause
)
