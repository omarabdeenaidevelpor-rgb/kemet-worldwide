import { PrismaClient } from '@prisma/client';

/**
 * Idempotent setup of reference data required by the app in EVERY environment:
 * currencies, roles, permissions and role→permission grants.
 * Safe to run repeatedly (used by both seed.ts and bootstrap.ts).
 */
export async function seedReferenceData(prisma: PrismaClient) {
  // ─── Currencies ───────────────────────────────────────────────────────────
  await prisma.currency.createMany({
    data: [
      { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1.0, isBase: true },
      { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.92 },
      { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', exchangeRate: 30.9 },
      { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', exchangeRate: 3.75 },
    ],
    skipDuplicates: true,
  });

  // ─── Roles ────────────────────────────────────────────────────────────────
  const roleNames = [
    'GENERAL_MANAGER','OPERATIONS_MANAGER','SHIPMENT_COORDINATOR',
    'CUSTOMER_SERVICE_AGENT','ACCOUNTANT','SALES_REPRESENTATIVE','AUDITOR',
  ] as const;

  const roleDescriptions: Record<string, string> = {
    GENERAL_MANAGER: 'Full system access',
    OPERATIONS_MANAGER: 'Manage operations, shipments, and staff',
    SHIPMENT_COORDINATOR: 'Create and manage shipments',
    CUSTOMER_SERVICE_AGENT: 'Customer support and CRM',
    ACCOUNTANT: 'Financial management',
    SALES_REPRESENTATIVE: 'Sales and customer acquisition',
    AUDITOR: 'Read-only access to all modules',
  };

  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      create: { name, description: roleDescriptions[name], isSystem: true },
      update: {},
    });
  }

  // ─── Permissions ──────────────────────────────────────────────────────────
  const modules = ['DASHBOARD','CUSTOMERS','SHIPMENTS','TRACKING','FINANCE','INCIDENTS','DOCUMENTS','REPORTS','EMPLOYEES','AUDIT','SETTINGS'] as const;
  const actions = ['VIEW','CREATE','EDIT','DELETE','EXPORT','APPROVE'] as const;

  for (const module of modules) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        create: { module, action },
        update: {},
      });
    }
  }

  const viewOnly = ['VIEW'] as const;
  const roleGrants: Record<(typeof roleNames)[number], { module: (typeof modules)[number]; actions: readonly (typeof actions)[number][] }[]> = {
    GENERAL_MANAGER: modules.map((module) => ({ module, actions })),
    OPERATIONS_MANAGER: [
      { module: 'DASHBOARD', actions: viewOnly },
      { module: 'CUSTOMERS', actions: ['VIEW', 'EDIT'] },
      { module: 'SHIPMENTS', actions: ['VIEW', 'CREATE', 'EDIT', 'APPROVE'] },
      { module: 'TRACKING', actions: ['VIEW', 'CREATE', 'EDIT'] },
      { module: 'INCIDENTS', actions: ['VIEW', 'CREATE', 'EDIT', 'APPROVE'] },
      { module: 'DOCUMENTS', actions: ['VIEW', 'CREATE', 'DELETE'] },
      { module: 'REPORTS', actions: ['VIEW', 'EXPORT'] },
      { module: 'EMPLOYEES', actions: viewOnly },
    ],
    SHIPMENT_COORDINATOR: [
      { module: 'DASHBOARD', actions: viewOnly },
      { module: 'CUSTOMERS', actions: viewOnly },
      { module: 'SHIPMENTS', actions: ['VIEW', 'CREATE', 'EDIT'] },
      { module: 'TRACKING', actions: ['VIEW', 'CREATE', 'EDIT'] },
      { module: 'INCIDENTS', actions: ['VIEW', 'CREATE', 'EDIT'] },
      { module: 'DOCUMENTS', actions: ['VIEW', 'CREATE'] },
    ],
    CUSTOMER_SERVICE_AGENT: [
      { module: 'DASHBOARD', actions: viewOnly },
      { module: 'CUSTOMERS', actions: ['VIEW', 'CREATE', 'EDIT'] },
      { module: 'SHIPMENTS', actions: viewOnly },
      { module: 'TRACKING', actions: viewOnly },
      { module: 'INCIDENTS', actions: ['VIEW', 'CREATE'] },
      { module: 'DOCUMENTS', actions: viewOnly },
    ],
    ACCOUNTANT: [
      { module: 'DASHBOARD', actions: viewOnly },
      { module: 'CUSTOMERS', actions: viewOnly },
      { module: 'SHIPMENTS', actions: viewOnly },
      { module: 'FINANCE', actions: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'EXPORT'] },
      { module: 'REPORTS', actions: ['VIEW', 'EXPORT'] },
      { module: 'DOCUMENTS', actions: viewOnly },
    ],
    SALES_REPRESENTATIVE: [
      { module: 'DASHBOARD', actions: viewOnly },
      { module: 'CUSTOMERS', actions: ['VIEW', 'CREATE', 'EDIT'] },
      { module: 'SHIPMENTS', actions: ['VIEW', 'CREATE'] },
      { module: 'REPORTS', actions: viewOnly },
    ],
    AUDITOR: modules.map((module) => ({ module, actions: viewOnly })),
  };

  const [roleRecords, permissionRecords] = await Promise.all([
    prisma.role.findMany(),
    prisma.permission.findMany(),
  ]);
  const roleIds = new Map(roleRecords.map((role) => [role.name, role.id]));
  const permissionIds = new Map(permissionRecords.map((permission) => [`${permission.module}:${permission.action}`, permission.id]));
  const grants = Object.entries(roleGrants).flatMap(([roleName, moduleGrants]) => {
    const roleId = roleIds.get(roleName as (typeof roleNames)[number]);
    if (!roleId) return [];
    return moduleGrants.flatMap(({ module, actions: moduleActions }) =>
      moduleActions.flatMap((action) => {
        const permissionId = permissionIds.get(`${module}:${action}`);
        return permissionId ? [{ roleId, permissionId }] : [];
      }),
    );
  });
  await prisma.$transaction([
    prisma.rolePermission.deleteMany(),
    prisma.rolePermission.createMany({ data: grants, skipDuplicates: true }),
  ]);

}
