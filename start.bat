@echo off
title Lumina - Media Platforma
cd /d "%~dp0"

echo ============================================
echo   Lumina - Media Platforma
echo   Ishga tushirish boshlanmoqda...
echo ============================================
echo.

REM --- 1) Node/npm mavjudligini tekshirish ---
where node >nul 2>nul
if errorlevel 1 (
    echo [XATOLIK] Node.js topilmadi. https://nodejs.org dan o'rnating.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo [XATOLIK] npm topilmadi. Node.js bilan birga o'rnatiladi.
    pause
    exit /b 1
)

REM --- 2) Bog'liqliklarni o'rnatish ---
if not exist "node_modules" (
    echo [1/5] Bog'liqliklar o'rnatilmoqda ^(npm install^)...
    call npm install
    if errorlevel 1 (
        echo [XATOLIK] npm install muvaffaqiyatsiz tugadi.
        pause
        exit /b 1
    )
) else (
    echo [1/5] node_modules topildi, o'rnatish o'tkazib yuborildi.
)

REM --- 3) Postgres'ni ishga tushirish (embedded, prisma\pgdata, background oyna) ---
REM pg-dev serverni shu script ichida emas, alohida oynada ushlab turadi,
REM chunki embedded-postgres node process o'lganda o'zi ham to'xtaydi.
echo [2/5] Postgres tekshirilmoqda...
node prisma\pg-portcheck.mjs >nul 2>nul
if not errorlevel 1 (
    echo [2/5] Postgres allaqachon ishlamoqda.
    goto :pgready
)
echo [2/5] Postgres background oynada ishga tushirilmoqda...
start "Lumina Postgres" /min cmd /c "node prisma\pg-dev.mjs --serve"
set COUNT=0
:pgwait
node prisma\pg-portcheck.mjs >nul 2>nul
if not errorlevel 1 goto :pgready
set /a COUNT+=1
if %COUNT% GEQ 90 (
    echo [XATOLIK] Postgres 90 soniyada ishga tushmadi. "Lumina Postgres" oynasini tekshiring.
    pause
    exit /b 1
)
timeout /t 1 >nul
goto :pgwait
:pgready
echo [2/5] Postgres tayyor.

REM --- 4) Migratsiyalar + seed ---
echo [3/5] Prisma client generatsiya qilinmoqda...
call npx prisma generate
if errorlevel 1 (
    echo [XATOLIK] prisma generate muvaffaqiyatsiz tugadi.
    pause
    exit /b 1
)
echo [3/5] Ma'lumotlar bazasi tayyorlanmoqda ^(prisma migrate^)...
call npx prisma migrate deploy
if errorlevel 1 (
    echo [XATOLIK] Migratsiyalar qo'llanmadi. Postgres ishlayotganini tekshiring.
    pause
    exit /b 1
)

echo [4/5] Demo ma'lumotlar tekshirilmoqda ^(seed^)...
REM Seed ixtiyoriy: demo videolar kerak bo'lsa, `set SEED_DEMO=1` qilib ishga tushiring.
REM Aks holda o'tkazib yuboriladi (demo kontent qayta yaratilmaydi).
if "%SEED_DEMO%"=="1" (
    call npx prisma db seed
    if errorlevel 1 (
        echo [OGOHLANTIRISH] Seed bajarilmadi - sayt baribir ochiladi.
    )
) else (
    echo [4/5] Seed o'tkazib yuborildi ^(demo kontent kerak bo'lsa: set SEED_DEMO=1^).
)

REM --- 5) Dev server + brauzer ---
echo [5/5] Server ishga tushirilmoqda: http://localhost:3000
echo       Boshlang ucun 5 soniya kutib brauzer ochiladi...
start "" cmd /c "timeout /t 5 >nul && start http://localhost:3000"
call npm run dev

pause
