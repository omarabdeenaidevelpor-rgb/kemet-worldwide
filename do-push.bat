@echo off
cd /d "C:\Users\ash\Downloads\kemet-worldwide"

echo ============================================
echo  Setting git identity
echo ============================================
git config user.email "kemet@kemet.com"
git config user.name "Kemet Worldwide"

echo ============================================
echo  Unstaging helper scripts
echo ============================================
git restore --staged deploy.ps1 push-changes.bat do-push.bat .push-done.txt .push-output.txt 2>nul

echo ============================================
echo  Final git status
echo ============================================
git status

echo ============================================
echo  Committing
echo ============================================
git commit -m "feat: add demo mode - app works without database"

echo ============================================
echo  Pushing to GitHub
echo ============================================
git push origin main

echo PUSH_COMPLETE
