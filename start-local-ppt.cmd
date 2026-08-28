@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js and try again.
  pause
  exit /b 1
)

call :server_ready
if errorlevel 1 (
  start "Local PPT 2 Server" /min node server.js

  for /l %%I in (1,1,20) do (
    timeout /t 1 /nobreak >nul
    call :server_ready
    if not errorlevel 1 goto open_app
  )

  echo Local PPT 2 server did not start on port 8765.
  echo Check the minimized server window for details.
  pause
  exit /b 1
)

:open_app
if /i "%~1"=="--check" exit /b 0
start "" "http://127.0.0.1:8765/"
exit /b 0

:server_ready
powershell.exe -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8765/' -TimeoutSec 1; if ($response.StatusCode -eq 200) { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%
