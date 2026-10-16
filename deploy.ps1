#!/usr/bin/env pwsh
# Script to commit and push changes to git

Set-Location $PSScriptRoot

Write-Host "===== Git Add =====" -ForegroundColor Cyan
git add -A

Write-Host "`n===== Git Status =====" -ForegroundColor Cyan
git status --short

Write-Host "`n===== Git Commit =====" -ForegroundColor Cyan
git commit -m "feat: add demo mode - bypass DB when DATABASE_URL is not set

- Add demo mode that works without database
- Auto-detect NEXTAUTH_URL from Railway environment
- Add demo data for customers, shipments, employees, invoices, incidents
- Support all API routes in demo mode
- Allow client testing before connecting real database"

Write-Host "`n===== Git Push =====" -ForegroundColor Cyan
git push

Write-Host "`n===== DONE! =====" -ForegroundColor Green
Write-Host "Changes pushed successfully to repository!" -ForegroundColor Green
