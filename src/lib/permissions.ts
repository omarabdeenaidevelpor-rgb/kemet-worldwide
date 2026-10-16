export type PermissionModule =
  | 'DASHBOARD' | 'CUSTOMERS' | 'SHIPMENTS' | 'TRACKING'
  | 'FINANCE' | 'INCIDENTS' | 'DOCUMENTS' | 'REPORTS'
  | 'EMPLOYEES' | 'AUDIT' | 'SETTINGS';

export type PermissionAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT' | 'APPROVE';

export function hasPermission(
  permissions: string[] | undefined,
  roles: string[] | undefined,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (roles?.includes('GENERAL_MANAGER')) return true;
  return permissions?.includes(`${module}:${action}`) ?? false;
}
