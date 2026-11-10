@echo off
cd /d "%~dp0"
start "" http://localhost:8178/
python -m http.server 8178
