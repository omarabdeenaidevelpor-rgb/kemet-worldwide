# KemetWorldwide — Enterprise Logistics Management System

Full-stack logistics platform for **KEMET Worldwide Co.** (Cairo, Egypt).
**Next.js 14.2.35 · TypeScript · Prisma · PostgreSQL · NextAuth · Tailwind · Vercel Blob**

## Status
- ✅ `npm run build` passes with **zero** TypeScript / ESLint errors (no ignored errors)
- ✅ Tested end-to-end: login, all 16 pages, RBAC for every role, document upload/download/delete, account deactivation
- 🧪 Sandbox preview: running via PM2 on port 3000 (local PostgreSQL 17)

## Features
Customers CRM · Shipments lifecycle · Tracking (Mapbox) · Invoices / Payments / Expenses · Incidents ·
Documents · Reports (CSV) · Employees · Audit log · Arabic RTL / English · Dark mode · 7 roles with RBAC.

## What was fixed / improved (v1.1)
| Area | Change |
|---|---|
| Build | Removed non-existent `@radix-ui/react-badge`; `next.config.ts` → `next.config.mjs`; duplicate import; 36 TS errors; `<Suspense>` on login; `force-dynamic` on all API routes |
| Security | RBAC added to `invoices/[id]`, `incidents/[id]`, `incidents/[id]/updates`, `tracking` |
| Security | Changing your own password requires the current password; stronger password rules; GM cannot deactivate/demote self |
| Security | Permissions re-synced from DB every 60s → deactivated users lose access within 1 minute |
| Security | Open-redirect fix on `callbackUrl`; Next upgraded to 14.2.35 (middleware-bypass CVE); HSTS; `X-Powered-By` removed; robots noindex |
| Security | Login success/failure/lockout written to audit log; secrets redacted from audit JSON; timing-safe unknown-email path |
| Storage | `src/lib/storage.ts`: **Vercel Blob (private)** when `BLOB_READ_WRITE_TOKEN` is set, local disk otherwise; uploads refused on serverless without Blob (no silent data loss) |
| Production | `npm run db:bootstrap` creates roles/permissions + first admin from env (no demo passwords) |
| Performance | 19 unused packages removed (443 → ~220 installs); login image 1.9 MB → 100 KB WebP; Mapbox CSS only on tracking page |
| UX | No language flash (server reads `kemet-lang` cookie, sets `lang`/`dir`); charts fixed in RTL; error / 404 / loading pages; `/api/health` |

## Local development
```bash
npm install
cp .env.example .env.local    # set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
cp .env.local .env            # Prisma CLI reads .env
npx prisma db push
npm run db:seed               # demo data (refuses to run in production)
npm run dev
```
Demo accounts (dev only): `admin@kemet.com / KemetAdmin2024!` — others: ops, finance, coordinator, cs, sales, auditor `@kemet.com` / `Kemet<Role>2024!`.

## Deploy to Vercel + Neon
1. Push to GitHub → import in Vercel.
2. Create a Neon Postgres DB. Set env vars from `.env.production.example`
   (`DATABASE_URL` pooled, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
3. Vercel → Storage → **Blob** → Connect (adds `BLOB_READ_WRITE_TOKEN`).
4. From your machine (direct DB URL):
   ```bash
   DATABASE_URL="postgresql://...direct..." npx prisma db push
   DATABASE_URL="..." ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='Strong#Pass123' ADMIN_NAME='Name' npm run db:bootstrap
   ```
5. Deploy. Check `https://<app>/api/health` → `{"status":"ok"}`.

> ⚠️ Do **not** run `db:seed` against production — it creates accounts with the publicly documented demo passwords.

## API (all require session + permission, except `/api/auth/*` and `/api/health`)
`/api/dashboard` · `/api/customers[/id]` · `/api/shipments[/id]` · `/api/tracking` · `/api/finance/{invoices[/id],payments,expenses}` ·
`/api/incidents[/id][/updates]` · `/api/documents[/id]` · `/api/reports?type=` · `/api/employees[/id]` · `/api/audit` · `/api/notifications` · `/api/settings/currencies`

## Not yet implemented / next steps
- UI for "change my password" (API ready: `PATCH /api/employees/:id` with `currentPassword` + `newPassword`)
- MFA (schema has `mfaEnabled/mfaSecret`, not wired)
- Prisma migrations (`prisma migrate`) instead of `db push` for production schema changes
- PDF/XLSX export (currently CSV)
- Automated test suite (Playwright/Vitest)
