@echo off
cd /d "%~dp0"
start "hanneung-local-server" /min python -m http.server 8791 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8791/"
echo Opened http://127.0.0.1:8791/
echo Keep the server window open while using clipboard copy.
pause
