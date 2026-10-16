@echo off
cd /d "%~dp0"

echo ===== Adding all files =====
git add -A

echo.
echo ===== Commit =====
git commit -m "feat: add demo mode - bypass DB when DATABASE_URL is not set"

echo.
echo ===== Push to remote =====
git push

echo.
echo ===== DONE =====
pause
