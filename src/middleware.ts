import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/health'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    if (isPublic(pathname)) return NextResponse.next();

    // Deactivated account (detected by the periodic JWT refresh)
    if (token?.disabled) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'ACCOUNT_DISABLED' }, { status: 401 });
      }
      const url = new URL('/login', req.url);
      url.searchParams.set('error', 'ACCOUNT_DISABLED');
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (isPublic(pathname)) return true;
        // API calls get a JSON 401 from the route handler instead of an HTML redirect
        if (pathname.startsWith('/api/')) return true;
        return !!token;
      },
    },
    pages: { signIn: '/login' },
  },
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|logo|robots.txt|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
