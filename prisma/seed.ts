/**
 * Seed = reference data + the 7 system accounts + REAL operational data from the Excel status report.
 * No fake/demo customers, shipments, invoices, incidents or notifications are created.
 *
 *   npm run db:seed            (refuses to run when NODE_ENV/VERCEL_ENV is production)
 *   npm run db:reset           wipe ALL business data, then seed
 */
import { execFileSync } from 'node:child_process';
import { PrismaClient, type RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedReferenceData } from './reference-data';
import { DEMO_ACCOUNTS } from '../src/lib/demo-accounts';

const prisma = new PrismaClient();

/** Delete every business record (keeps roles/permissions/currencies). */
export async function wipeBusinessData() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.document.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.incidentUpdate.deleteMany(),
    prisma.incident.deleteMany(),
    prisma.trackingEvent.deleteMany(),
    prisma.shipmentStatusHistory.deleteMany(),
    prisma.shipmentLeg.deleteMany(),
    prisma.shipmentContainer.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.customerContact.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.carrier.deleteMany(),
  ]);
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('Refusing to seed in production. Use `npm run db:bootstrap` + `npm run db:import` instead.');
  }

  if (process.argv.includes('--reset')) {
    console.log('🧹 Removing all existing business data...');
    await wipeBusinessData();
  }

  console.log('🌱 Reference data (currencies, roles, permissions)...');
  await seedReferenceData(prisma);

  console.log('👤 System accounts...');
  for (const a of DEMO_ACCOUNTS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: a.role as RoleName } });
    const passwordHash = await bcrypt.hash(a.password, 12);
    // Always (re)set the password + unlock, so the credentials shown on the login page are guaranteed to work.
    const user = await prisma.user.upsert({
      where: { email: a.email },
      create: { email: a.email, name: a.name, passwordHash, isActive: true },
      update: { name: a.name, passwordHash, isActive: true, failedLoginAttempts: 0, lockedUntil: null },
    });
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: user.id } }),
      prisma.userRole.create({ data: { userId: user.id, roleId: role.id } }),
    ]);
    console.log(`  ✓ ${a.labelEn.padEnd(22)} ${a.email}`);
  }

  console.log('📦 Real shipment data from Excel...');
  execFileSync('npx', ['tsx', 'prisma/import-status-report.ts', 'prisma/data/mowara-status-2026-09-08.json'], {
    stdio: 'inherit',
  });

  console.log('\n✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
