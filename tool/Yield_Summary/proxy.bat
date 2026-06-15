@echo off
title PP00 CORS Proxy (Port 8780)
cd /d "%~dp0"
echo ==================================================
echo  Starting PP00 Local CORS Proxy (Port 8780)...
echo ==================================================
python cors_proxy.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start Python script. 
    echo Please make sure Python is installed and added to PATH.
    echo.
    pause
)
