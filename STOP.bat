@echo off
title Stop SecureStream
echo.
echo  Stopping all SecureStream services...
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    [OK] Stopped Next.js port 3000
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3003 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    [OK] Stopped Signaling port 3003
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3004 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    [OK] Stopped Moderation port 3004
)

echo.
echo     All services stopped!
echo.
pause
