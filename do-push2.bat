@echo off
cd /d "C:\Users\ash\Downloads\kemet-worldwide"

git config user.email "kemet@kemet.com"
git config user.name "Kemet Worldwide"

git add -A

git commit -m "fix: resolve TypeScript build errors"

git push --force-with-lease origin main

echo PUSH_DONE=%ERRORLEVEL%
