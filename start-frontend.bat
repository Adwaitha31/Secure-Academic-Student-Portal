@echo off
REM Start Frontend Development Server

echo.
echo ╔════════════════════════════════════════════════╗
echo ║   STARTING FRONTEND SERVER                     ║
echo ║   Port: 5173                                   ║
echo ║   URL: http://localhost:5173                   ║
echo ╚════════════════════════════════════════════════╝
echo.

echo Checking dependencies...
if not exist node_modules (
    echo Installing packages...
    call npm install
)

echo.
echo Starting Vite development server...
echo.

call npm run dev

pause
