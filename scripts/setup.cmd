@echo off
setlocal
where node >nul 2>nul || (echo Node.js 18+ is required & exit /b 1)
echo Node version:
node -v
call npm test || exit /b 1
echo.
echo Ready. Optional: npm link
