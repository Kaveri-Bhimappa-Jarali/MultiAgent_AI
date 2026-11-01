@echo off
echo =========================================================================
echo    Multi-Agent AI Security Operations Center (SOC) Launcher
echo =========================================================================

REM Add portable Node.js to PATH if present
if exist "%~dp0.tools\node\node.exe" (
    set "PATH=%~dp0.tools\node;%PATH%"
)

echo Starting Backend Server on http://127.0.0.1:8000 ...
start "SOC Backend Server" cmd /k "title SOC Backend && cd /d %~dp0 && .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server on http://localhost:3000 ...
start "SOC Frontend Web" cmd /k "title SOC Frontend && cd /d %~dp0frontend && npm run dev"

echo.
echo =========================================================================
echo    SOC Servers launched successfully!
echo    - Web UI: http://localhost:3000
echo    - Backend API & Swagger: http://127.0.0.1:8000/docs
echo    Default Login:
echo      Username: admin
echo      Password: Admin@SOC2026!
echo =========================================================================
pause
