@echo off
title SecureStream - Startup
echo.
echo  ============================================================
echo     SecureStream - One-Click Startup
echo     Windows Edition
echo  ============================================================
echo.
echo  [Step 1/6] Checking prerequisites...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo    [ERROR] Node.js is NOT installed!
    echo    Please download it from: https://nodejs.org
    echo    Choose the LTS version. After installing, run this again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo    [OK] Node.js: %%v

where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo    [WARN] Bun not found. Installing via npm...
    npm install -g bun
    where bun >nul 2>&1
    if %errorlevel% neq 0 (
        echo    [ERROR] Bun install failed. Try: npm install -g bun
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('bun --version') do echo    [OK] Bun: v%%v

echo.
echo  [Step 2/6] Setting up .env file...
echo.

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
    ) else (
        echo DATABASE_URL=file:./db/custom.db > .env
        echo ALLOWED_ORIGINS=http://localhost:3000 >> .env
        echo SIGNALING_PORT=3003 >> .env
        echo MODERATION_PORT=3004 >> .env
        echo MODERATION_SERVICE_URL=http://localhost:3004 >> .env
        echo TRUST_BLACKLIST_THRESHOLD=30 >> .env
        echo FAST_SKIP_WINDOW_MS=10000 >> .env
        echo FAST_SKIP_PENALTY_SECONDS=30 >> .env
        echo HEARTBEAT_TIMEOUT_MS=30000 >> .env
        echo MAX_QUEUE_SIZE=200 >> .env
        echo FRAME_MAX_SIZE_KB=200 >> .env
        echo NEXT_PUBLIC_STUN_SERVER_1=stun:stun.l.google.com:19302 >> .env
        echo NEXT_PUBLIC_STUN_SERVER_2=stun:stun1.l.google.com:19302 >> .env
        echo NEXT_PUBLIC_TURN_SERVER= >> .env
        echo NEXT_PUBLIC_TURN_USERNAME= >> .env
        echo NEXT_PUBLIC_TURN_CREDENTIAL= >> .env
        echo NEXT_PUBLIC_APP_NAME=SecureStream >> .env
        echo NEXT_PUBLIC_APP_URL=http://localhost:3000 >> .env
        echo NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS=2000 >> .env
        echo NEXT_PUBLIC_FRAME_WIDTH=128 >> .env
        echo NEXT_PUBLIC_FRAME_HEIGHT=96 >> .env
        echo NEXT_PUBLIC_FRAME_QUALITY=0.3 >> .env
    )
    echo    [OK] Created .env file
) else (
    echo    [OK] .env already exists
)

echo.
echo  [Step 3/6] Installing dependencies...
echo    This may take 1-2 minutes. Please wait...
echo.

echo    [1/3] Main project...
call bun install
if %errorlevel% neq 0 (
    echo    [ERROR] Main install failed
    pause
    exit /b 1
)
echo    [OK] Main project done

echo    [2/3] Signaling server...
pushd mini-services\signaling-server
call bun install
popd
echo    [OK] Signaling server done

echo    [3/3] Moderation service...
pushd mini-services\moderation-service
call bun install
popd
echo    [OK] Moderation service done

echo.
echo  [Step 4/6] Setting up database...
echo.

if not exist "db" mkdir db
call bun run db:push
echo    [OK] Database ready

echo.
echo  [Step 5/6] Killing old processes on ports...
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    Killed old process on port 3000
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3003 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    Killed old process on port 3003
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3004 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    Killed old process on port 3004
)
echo    [OK] Ports cleared

echo.
echo  [Step 6/6] Starting all services...
echo    3 new windows will open. DO NOT close them!
echo.

if not exist ".securestream-logs" mkdir .securestream-logs

start "SecureStream - Next.js (3000)" cmd /k "cd /d %~dp0 && bun run dev"
timeout /t 4 /nobreak >nul

start "SecureStream - Signaling (3003)" cmd /k "cd /d %~dp0mini-services\signaling-server && bun --hot index.ts"
timeout /t 3 /nobreak >nul

start "SecureStream - Moderation (3004)" cmd /k "cd /d %~dp0mini-services\moderation-service && bun --hot index.ts"
timeout /t 3 /nobreak >nul

echo.
echo  ============================================================
echo.
echo     ALL SERVICES STARTED!
echo.
echo     Open your browser: http://localhost:3000
echo.
echo     Keep the 3 server windows open!
echo     To stop: close the 3 windows
echo     Or double-click STOP.bat
echo.
echo  ============================================================
echo.

start http://localhost:3000

echo    Press any key to close this window...
pause >nul
