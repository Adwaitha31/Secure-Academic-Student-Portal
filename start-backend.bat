@echo off
REM Start Backend Server for Exam Portal

echo.
echo ╔════════════════════════════════════════════════╗
echo ║   STARTING BACKEND SERVER                      ║
echo ║   Port: 5000                                   ║
echo ╚════════════════════════════════════════════════╝
echo.

cd real-server

echo Checking dependencies...
if not exist node_modules (
    echo Installing packages...
    call npm install
)

echo.
echo Starting server...
echo.

call npm start

pause
