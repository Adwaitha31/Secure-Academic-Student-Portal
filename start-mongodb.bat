@echo off
REM Secure Exam Portal - MongoDB Setup Script for Windows

echo.
echo ╔════════════════════════════════════════════════╗
echo ║   MONGODB SETUP FOR EXAM PORTAL               ║
echo ╚════════════════════════════════════════════════╝
echo.

REM Check if MongoDB is installed
where mongod >nul 2>nul

if %errorlevel% neq 0 (
    echo ❌ MongoDB is not installed or not in PATH
    echo.
    echo Please install MongoDB from:
    echo https://www.mongodb.com/try/download/community
    echo.
    echo After installation, close and reopen this terminal
    pause
    exit /b 1
)

echo ✅ MongoDB found!
echo.
echo Starting MongoDB service...
echo.

mongod --dbpath "%cd%\data"

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Error starting MongoDB
    echo.
    echo Try these solutions:
    echo 1. Create a 'data' folder in the current directory
    echo 2. Install MongoDB as a Windows Service
    echo 3. Check MongoDB documentation
    pause
)
