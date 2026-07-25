@echo off
title Page Pulse - Starting...
color 0B

echo.
echo  =========================================
echo    PAGE PULSE - Starting Application...
echo  =========================================
echo.

echo  [1/2] Starting Backend Server (Port 3000)...
start "Page Pulse - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo  [2/2] Starting Frontend Server (Port 5173)...
start "Page Pulse - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  Waiting 4 seconds for servers to start up...
timeout /t 4 /nobreak > nul

echo  Opening browser at http://localhost:5173
start "" "http://localhost:5173"

echo.
echo  =========================================
echo    Both servers are running!
echo    Backend : http://localhost:3000
echo    Frontend: http://localhost:5173
echo.
echo    Close the two server windows to stop.
echo  =========================================
echo.
pause
