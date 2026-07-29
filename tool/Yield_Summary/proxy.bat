@echo off
title PP00 CORS Proxy (Port 8780)
setlocal
cd /d "%~dp0"
echo ==================================================
echo  Starting PP00 Local CORS Proxy (Port 8780)...
echo ==================================================
echo [PYTHON] Checking Python runtime...

set "PYTHON="

py -3 --version >nul 2>&1
if not errorlevel 1 set "PYTHON=py -3"

if not defined PYTHON (
    python --version >nul 2>&1
    if not errorlevel 1 set "PYTHON=python"
)

if defined PYTHON (
    echo [PYTHON] Found: %PYTHON%
    goto :run_proxy
)

echo [PYTHON] Not found. Start auto install...

where winget >nul 2>&1
if not %errorlevel%==0 (
    echo [PYTHON] winget not found. Fallback to python.org installer...
    goto :download_python
)

echo [PYTHON] Installing via winget...
winget install --id Python.Python.3.14 --exact --source winget --accept-package-agreements --accept-source-agreements
if not %errorlevel%==0 (
    echo [PYTHON] winget installation failed. Fallback to python.org installer...
    goto :download_python
)

goto :recheck_python

:download_python
set "python_arch=%PROCESSOR_ARCHITEW6432%"
if not defined python_arch set "python_arch=%PROCESSOR_ARCHITECTURE%"
if /i "%python_arch%"=="ARM64" (
    set "python_url=https://www.python.org/ftp/python/3.14.6/python-3.14.6-arm64.exe"
)
if /i "%python_arch%"=="AMD64" (
    set "python_url=https://www.python.org/ftp/python/3.14.6/python-3.14.6-amd64.exe"
)
if not defined python_url (
    echo ERROR: Unsupported Windows architecture: %python_arch%.
    pause
    exit /b 1
)
set "python_installer=%TEMP%\python-3.14.6-installer.exe"
set "PROXY_PYTHON_URL=%python_url%"
set "PROXY_PYTHON_INSTALLER=%python_installer%"

echo Downloading Python from python.org...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri $env:PROXY_PYTHON_URL -OutFile $env:PROXY_PYTHON_INSTALLER"
if not %errorlevel%==0 (
    echo ERROR: Failed to download Python installer.
    pause
    exit /b 1
)

echo Installing Python...
start "" /wait "%python_installer%" /quiet InstallAllUsers=0 InstallLauncherAllUsers=0 PrependPath=1 Include_launcher=1
if not %errorlevel%==0 (
    echo ERROR: Python installation failed.
    pause
    exit /b 1
)

:recheck_python
echo [PYTHON] Re-checking Python runtime...
set "PYTHON="

py -3 --version >nul 2>&1
if not errorlevel 1 set "PYTHON=py -3"

if not defined PYTHON (
    python --version >nul 2>&1
    if not errorlevel 1 set "PYTHON=python"
)

rem PATH is not refreshed in this session after install, so locate python.exe directly.
if not defined PYTHON (
    for /f "delims=" %%p in ('dir /b /s "%LocalAppData%\Programs\Python\python.exe" 2^>nul') do (
        if not defined PYTHON set "PYTHON="%%p""
    )
)

if not defined PYTHON (
    echo ERROR: Python installed, but no Python command is available. Close and reopen this window, then run again.
    pause
    exit /b 1
)

echo [PYTHON] Ready: %PYTHON%

:run_proxy
echo [PROXY] Starting proxy.py...
%PYTHON% proxy.py
set "exit_code=%errorlevel%"
if not %exit_code%==0 (
    echo.
    echo [ERROR] Proxy exited with error code %exit_code%.
    echo.
    pause
)
endlocal & exit /b %exit_code%
