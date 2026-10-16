/**
 * Production bootstrap — creates reference data + the first General Manager account.
 *
 *   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='Strong#Pass123' ADMIN_NAME='Your Name' npm run db:bootstrap
 *
 * Idempotent: re-running never overwrites an existing user's password.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedReferenceData } from './reference-data';

const prisma = new PrismaClient();

function assertStrongPassword(pw: string) {
  const problems: string[] = [];
  if (pw.length < 12) problems.push('at least 12 characters');
  if (!/[A-Z]/.test(pw)) problems.push('an uppercase letter');
  if (!/[a-z]/.test(pw)) problems.push('a lowercase letter');
  if (!/[0-9]/.test(pw)) problems.push('a digit');
  if (/^Kemet\w+2024!$/.test(pw)) problems.push('not be one of the published demo passwords');
  if (problems.length) throw new Error(`ADMIN_PASSWORD must contain ${problems.join(', ')}.`);
}

async function main() {
  console.log('🔧 Bootstrapping reference data (currencies, roles, permissions)...');
  await seedReferenceData(prisma);
  console.log('  ✓ Reference data ready');

  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'General Manager';

  if (!email || !password) {
    console.log('ℹ️  ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin creation.');
    return;
  }
  assertStrongPassword(password);

  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'GENERAL_MANAGER' } });
  const existing = await prisma.user.findUnique({ where: { email } });
  const user =
    existing ??
    (await prisma.user.create({
      data: { email, name, passwordHash: await bcrypt.hash(password, 12), isActive: true },
    }));

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    create: { userId: user.id, roleId: role.id },
    update: {},
  });

  console.log(existing ? `  ✓ Admin ${email} already existed (password unchanged), GM role ensured` : `  ✓ Admin ${email} created`);
}

main()
  .catch((e) => {
    console.error('❌', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
