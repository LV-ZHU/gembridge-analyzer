@echo off
setlocal
where node >nul 2>nul || (echo Node.js 18+ is required & exit /b 1)
echo Node version:
node -v
call npm.cmd install || exit /b 1
call npm.cmd test || exit /b 1
echo.
call npm.cmd link || exit /b 1
for /f "delims=" %%i in ('npm.cmd prefix -g') do set "NPM_GLOBAL=%%i"
if exist "%NPM_GLOBAL%\gb.ps1" del /q "%NPM_GLOBAL%\gb.ps1"
if exist "%NPM_GLOBAL%\gembridge.ps1" del /q "%NPM_GLOBAL%\gembridge.ps1"
echo Ready. You can now run: gb help
