import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { DEMO_ACCOUNTS } from './demo-accounts';

// ---------------------------------------------------------------------------
// Demo mode: when DATABASE_URL is absent we bypass Prisma entirely and
// authenticate against the hard-coded demo accounts only.
// ---------------------------------------------------------------------------
const DEMO_MODE = !process.env.DATABASE_URL;

// Lazy imports so we don't crash at startup when DB is unavailable
let prismaModule: typeof import('./prisma') | null = null;
let auditModule: typeof import('./audit') | null = null;

async function getPrisma() {
  if (!prismaModule) prismaModule = await import('./prisma');
  return prismaModule.prisma;
}

async function getAudit() {
  if (!auditModule) auditModule = await import('./audit');
  return auditModule.createAuditLog;
}

const PERMISSION_REFRESH_MS = 60 * 1000; // 1 minute

const userAccessInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  },
} as const;

function flattenAccess(user: {
  userRoles: { role: { name: string; rolePermissions: { permission: { module: string; action: string } }[] } }[];
}) {
  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = user.userRoles
    .flatMap((ur) => ur.role.rolePermissions)
    .map((rp) => `${rp.permission.module}:${rp.permission.action}`);
  return { roles, permissions: [...new Set(permissions)] };
}

/** Returns null if the user no longer exists or is deactivated. */
async function loadUserAccess(userId: string) {
  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userAccessInclude });
  if (!user || !user.isActive) return null;
  return { name: user.name, ...flattenAccess(user) };
}

// Constant-time-ish dummy hash so "unknown email" and "wrong password" take similar time
const DUMMY_HASH = '$2a$12$jJDo7oxb4jeUmMQE8B0PDuGpbgsBzKgtKLko3hB82/7bowljTgJzK';

// ---------------------------------------------------------------------------
// Demo-mode permissions: give each role a full set of permissions so the
// client can navigate the app without a real DB.
// ---------------------------------------------------------------------------
const ALL_MODULES = ['SHIPMENTS','CUSTOMERS','EMPLOYEES','FINANCE','DOCUMENTS','INCIDENTS','AUDIT','REPORTS','SETTINGS','NOTIFICATIONS','TRACKING','DASHBOARD'];
const ALL_ACTIONS = ['READ','CREATE','UPDATE','DELETE','EXPORT'];
const ALL_PERMISSIONS = ALL_MODULES.flatMap(m => ALL_ACTIONS.map(a => `${m}:${a}`));

function demoPermissionsForRole(role: string): string[] {
  if (role === 'AUDITOR') return ALL_MODULES.map(m => `${m}:READ`);
  if (role === 'ACCOUNTANT') return [...ALL_MODULES.map(m => `${m}:READ`), 'FINANCE:CREATE','FINANCE:UPDATE','FINANCE:DELETE','FINANCE:EXPORT'];
  return ALL_PERMISSIONS; // all other roles get full access in demo
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 hours
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const headers = (req?.headers ?? {}) as Record<string, string | undefined>;
        const ipAddress = headers['x-forwarded-for']?.split(',')[0]?.trim() ?? null;
        const userAgent = headers['user-agent'] ?? null;
        if (!credentials?.email || !credentials?.password) {
          throw new Error('MISSING_CREDENTIALS');
        }

        const email = credentials.email.toLowerCase().trim();

        // ----------------------------------------------------------------
        // DEMO MODE — no database required
        // ----------------------------------------------------------------
        if (DEMO_MODE) {
          const account = DEMO_ACCOUNTS.find(a => a.email === email);
          if (!account || account.password !== credentials.password) {
            await bcrypt.compare(credentials.password, DUMMY_HASH); // timing safety
            throw new Error('INVALID_CREDENTIALS');
          }
          const permissions = demoPermissionsForRole(account.role);
          return {
            id: `demo-${account.role}`,
            email: account.email,
            name: account.name,
            image: null,
            roles: [account.role],
            permissions,
          };
        }

        // ----------------------------------------------------------------
        // NORMAL MODE — database required
        // ----------------------------------------------------------------
        const prisma = await getPrisma();
        const createAuditLog = await getAudit();

        const user = await prisma.user.findUnique({
          where: { email },
          include: userAccessInclude,
        });

        if (!user) {
          await bcrypt.compare(credentials.password, DUMMY_HASH);
          throw new Error('INVALID_CREDENTIALS');
        }
        if (!user.isActive) throw new Error('ACCOUNT_DISABLED');

        // Rate limiting
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('ACCOUNT_LOCKED');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          const maxAttempts = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS ?? '5');
          const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES ?? '15');
          const newAttempts = user.failedLoginAttempts + 1;
          const lockedUntil = newAttempts >= maxAttempts
            ? new Date(Date.now() + windowMinutes * 60 * 1000)
            : null;

          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: newAttempts, lockedUntil },
          });

          await createAuditLog({
            userId: user.id,
            action: lockedUntil ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
            module: 'AUTH',
            newValues: { attempts: newAttempts },
            ipAddress,
            userAgent,
          });
          throw new Error(lockedUntil ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS');
        }

        // Reset failed attempts on success
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        const { roles, permissions } = flattenAccess(user);
        await createAuditLog({ userId: user.id, action: 'LOGIN', module: 'AUTH', ipAddress, userAgent });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          roles,
          permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = (user as any).roles;
        token.permissions = (user as any).permissions;
        token.refreshedAt = Date.now();
        token.disabled = false;
        return token;
      }

      // Demo mode: skip DB refresh
      if (DEMO_MODE) return token;

      // Re-sync roles/permissions/active-state from the DB periodically
      const last = (token.refreshedAt as number | undefined) ?? 0;
      if (token.id && Date.now() - last > PERMISSION_REFRESH_MS) {
        try {
          const access = await loadUserAccess(token.id as string);
          if (!access) {
            token.disabled = true;
            token.roles = [];
            token.permissions = [];
          } else {
            token.disabled = false;
            token.roles = access.roles;
            token.permissions = access.permissions;
            token.name = access.name;
          }
          token.refreshedAt = Date.now();
        } catch (err) {
          // DB hiccup: keep previous claims, retry on next request
          console.error('[AUTH] permission refresh failed', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.disabled ? [] : (token.roles as string[]);
        session.user.permissions = token.disabled ? [] : (token.permissions as string[]);
        session.user.disabled = Boolean(token.disabled);
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
};

export async function getSession() {
  const session = await getServerSession(authOptions);
  // Deactivated/deleted users are treated as signed-out everywhere on the server.
  if (!session?.user || session.user.disabled) return null;
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user || session.user.disabled) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function requirePermission(module: string, action: string) {
  const session = await requireAuth();
  const perm = `${module}:${action}`;
  if (!session.user.permissions?.includes(perm) && !session.user.roles?.includes('GENERAL_MANAGER')) {
    throw new Error('FORBIDDEN');
  }
  return session;
}
