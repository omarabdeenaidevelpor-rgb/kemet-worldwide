'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Globe, Ship, Plane, Truck, KeyRound, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { DEMO_ACCOUNTS, SHOW_DEMO_ACCOUNTS, type DemoAccount } from '@/lib/demo-accounts';

const ERROR_MESSAGES: Record<string, { en: string; ar: string }> = {
  INVALID_CREDENTIALS: { en: 'Invalid email or password', ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
  ACCOUNT_LOCKED: { en: 'Account locked. Try again in 15 minutes.', ar: 'تم قفل الحساب. حاول مرة أخرى بعد 15 دقيقة.' },
  ACCOUNT_DISABLED: { en: 'Your account has been disabled.', ar: 'تم تعطيل حسابك.' },
  MISSING_CREDENTIALS: { en: 'Please enter your email and password.', ar: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' },
  DEFAULT: { en: 'An error occurred. Please try again.', ar: 'حدث خطأ. يرجى المحاولة مرة أخرى.' },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

/** Only allow same-origin relative paths to avoid open-redirects via ?callbackUrl= */
function safeCallbackUrl(raw: string | null): string {
  if (!raw) return '/dashboard';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/dashboard';
    if (url.pathname.startsWith('/login')) return '/dashboard';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/dashboard';
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, setLang, t, dir } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const initialError = searchParams.get('error');
  const [error, setError] = useState(() => {
    if (!initialError) return '';
    const msg = ERROR_MESSAGES[initialError] ?? ERROR_MESSAGES.DEFAULT;
    return lang === 'ar' ? msg.ar : msg.en;
  });

  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        const msg = ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.DEFAULT;
        setError(lang === 'ar' ? msg.ar : msg.en);
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError(lang === 'ar' ? ERROR_MESSAGES.DEFAULT.ar : ERROR_MESSAGES.DEFAULT.en);
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: account.email,
        password: account.password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        const msg = ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.DEFAULT;
        setError(lang === 'ar' ? msg.ar : msg.en);
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError(lang === 'ar' ? ERROR_MESSAGES.DEFAULT.ar : ERROR_MESSAGES.DEFAULT.en);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir={dir} className="min-h-screen flex bg-brand-navy">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/login-bg.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy/95 via-brand-blue/85 to-brand-navy/90" />

        <div className="relative z-10">
          <div className="inline-flex rounded-2xl bg-white px-6 py-4 shadow-2xl shadow-black/30">
            <BrandLogo variant="color" priority className="h-14" />
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight text-white drop-shadow">
            {lang === 'ar' ? 'منصة إدارة الخدمات اللوجستية المتكاملة' : 'Integrated Logistics Management Platform'}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/75">
            {lang === 'ar'
              ? 'تتبع الحاويات والشحنات البحرية والجوية والبرية، المستندات، التخليص الجمركي والفواتير — في مكان واحد.'
              : 'Track containers, sea / air / road shipments, documents, customs clearance and invoicing — in one place.'}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: lang === 'ar' ? 'بحري' : 'Sea Freight', icon: Ship },
              { label: lang === 'ar' ? 'جوي' : 'Air Freight', icon: Plane },
              { label: lang === 'ar' ? 'بري' : 'Road Haulage', icon: Truck },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <m.icon className="mb-2 h-6 w-6 text-brand-accent" />
                <p className="text-xs font-medium text-white/85">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/50">
          <span>&ldquo;{lang === 'ar' ? 'فكر عالمياً، تصرف محلياً' : 'Think Global, Act Local'}&rdquo;</span>
          <span>© {new Date().getFullYear()} KEMET Worldwide Co.</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-slate-50 p-6 sm:p-10 dark:bg-gray-950">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <BrandLogo variant="auto" priority className="h-11 lg:hidden" />
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="ms-auto inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground dark:bg-gray-900"
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === 'en' ? 'العربية' : 'English'}
            </button>
          </div>

          <div className="rounded-2xl border bg-card p-7 shadow-xl shadow-slate-200/60 dark:shadow-none">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {lang === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {lang === 'ar'
                ? 'قم بتسجيل الدخول للوصول إلى لوحة التحكم'
                : 'Sign in to access your dashboard'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === 'ar' ? 'example@kemet.com' : 'example@kemet.com'}
                autoComplete="email"
                autoFocus
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-brand-blue text-white hover:bg-brand-blue/90"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}
                </>
              ) : (
                lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'
              )}
            </Button>
          </form>

          </div>

          {SHOW_DEMO_ACCOUNTS && (
            <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm" aria-labelledby="demo-accounts-title">
              <div className="mb-3 flex items-center justify-between">
                <h3 id="demo-accounts-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <KeyRound className="h-4 w-4 text-brand-blue dark:text-brand-accent" />
                  {lang === 'ar' ? 'حسابات النظام — دخول سريع' : 'System accounts — quick sign-in'}
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {lang === 'ar' ? 'اضغط على الحساب' : 'Click an account'}
                </span>
              </div>
              <ul className="grid gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <li key={acc.email}>
                    <button
                      type="button"
                      onClick={() => quickLogin(acc)}
                      disabled={loading}
                      data-testid={`quick-login-${acc.role}`}
                      className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-start transition-colors hover:border-brand-blue/20 hover:bg-brand-blue/5 disabled:opacity-60 dark:hover:bg-white/5"
                    >
                      <span className="text-lg leading-none" aria-hidden>{acc.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {lang === 'ar' ? acc.labelAr : acc.labelEn}
                        </span>
                        <span dir="ltr" className="block truncate font-mono text-[11px] text-muted-foreground">
                          {acc.email} · {acc.password}
                        </span>
                      </span>
                      <LogIn className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {lang === 'ar' ? 'نظام مخصص للموظفين المصرح لهم فقط' : 'Authorized personnel only'}
          </p>
        </div>
      </div>
    </div>
  );
}
