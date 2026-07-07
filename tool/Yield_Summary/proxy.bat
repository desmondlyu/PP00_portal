@echo off
title PP00 CORS Proxy (Port 8780)
cd /d "%~dp0"
echo ==================================================
echo  Starting PP00 Local CORS Proxy (Port 8780)...
echo ==================================================

REM Try py launcher first, then fall back to python
where py >nul 2>nul
if %errorlevel% equ 0 (
    py proxy.py
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        python proxy.py
    ) else (
        echo.
        echo [ERROR] Neither 'py' nor 'python' found in PATH.
        echo Please install Python or add it to PATH.
        echo.
        pause
        exit /b 1
    )
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Proxy exited with error code %errorlevel%.
    echo.
    pause
)
