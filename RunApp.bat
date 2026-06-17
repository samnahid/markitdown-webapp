@echo off
title MarkItDown Web Converter Launcher
echo ===================================================
echo   MarkItDown Web Application starting...
echo   Design and Developed by Shamim Ahmed Nahid
echo ===================================================
echo.

:: লোকাল আইপি অ্যাড্রেস খোঁজা হচ্ছে অন্য ডিভাইস থেকে অ্যাক্সেস করার জন্য
:: আমরা ভার্চুয়াল ইন্টারফেসগুলো (যেমন WSL, vEthernet, VirtualBox) বাদ দিয়ে আইপি খুঁজছি
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*vEthernet*' -and $_.InterfaceAlias -notlike '*VirtualBox*' -and $_.InterfaceAlias -notlike '*WSL*' } | Select-Object -First 1).IPAddress"`) do set LOCAL_IP=%%i

echo   Local Address:   http://127.0.0.1:5000

if defined LOCAL_IP (
    echo   Network Address: http://%LOCAL_IP%:5000
    echo   (Use this Network Address to access from other devices on the same Wi-Fi/Network)
)
if not defined LOCAL_IP (
    echo   Network Address: Could not determine local network IP.
)
echo ===================================================
echo.

:: ভার্চুয়াল এনভায়রনমেন্ট পাইথন এবং app.py ফাইলের পাথ সেট করছি
:: ইউজারের লোকাল সিস্টেমের পাথ আগে চেক করছি, না থাকলে লোকাল ভেনভ বা গ্লোবাল পাইথন ব্যবহার করা হবে
if exist "C:\Users\Naimul\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe" (
    set VENV_PYTHON=C:\Users\Naimul\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe
) else if exist "%~dp0venv\Scripts\python.exe" (
    set VENV_PYTHON=%~dp0venv\Scripts\python.exe
) else if exist "%~dp0.venv\Scripts\python.exe" (
    set VENV_PYTHON=%~dp0.venv\Scripts\python.exe
) else (
    set VENV_PYTHON=python
)
set APP_PATH=%~dp0webapp\app.py

:: ব্যাকগ্রাউন্ডে ২ সেকেন্ড অপেক্ষা করে ব্রাউজারে লোকাল সাইটটি ওপেন করার জন্য কমান্ড রান করছি
start /b cmd /c "timeout /t 2 /nobreak > nul && start http://127.0.0.1:5000"

:: পাইথন ফ্লাস্ক সার্ভারটি চালু করছি
echo [Server] Starting Flask Server...
"%VENV_PYTHON%" "%APP_PATH%"

echo.
echo Server stopped.
pause
