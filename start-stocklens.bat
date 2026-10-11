@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Opening the download page...
  start https://nodejs.org/en/download
  pause
  exit /b 1
)
echo Installing packages (first run takes a few minutes)...
call npm install
echo Starting StockLens. Scan the QR code with Expo Go on your phone.
call npm run mobile
pause
