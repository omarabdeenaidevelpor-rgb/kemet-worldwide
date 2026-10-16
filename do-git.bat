@echo off
cd /d "C:\Users\ash\Downloads\kemet-worldwide"

git config user.email "kemet@kemet.com"
git config user.name "Kemet Worldwide"

echo === STATUS ===
git status --short

echo === ADD ALL ===
git add -A

echo === COMMIT ===
git commit -m "fix: TypeScript build errors + demo mode improvements"

echo === PUSH ===
git push origin main

echo === RESULT: %ERRORLEVEL% ===
