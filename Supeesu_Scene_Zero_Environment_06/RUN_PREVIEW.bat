@echo off
cd /d "%~dp0"
echo Starting Supeesu Scene Zero Environment 05 on port 8166...
where py >nul 2>&1
if errorlevel 1 (
  start "Supeesu Environment 05 Server" cmd /k "python -m http.server 8166"
) else (
  start "Supeesu Environment 05 Server" cmd /k "py -3 -m http.server 8166"
)
timeout /t 2 /nobreak >nul
start "" "http://localhost:8166/scene/"
echo Living Pool: http://localhost:8166/scene/
echo Time Laboratory: http://localhost:8166/dev/
echo Keep the preview server window open while testing.
