'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Loader2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { hasPermission } from '@/lib/permissions';
import { toast } from '@/components/ui/use-toast';

interface CurrencyRecord {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: string;
  isBase: boolean;
}

export function SettingsContent() {
  const { data: session } = useSession();
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const canViewSettings = hasPermission(session?.user.permissions, session?.user.roles, 'SETTINGS', 'VIEW');
  const canEditSettings = hasPermission(session?.user.permissions, session?.user.roles, 'SETTINGS', 'EDIT');
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [baseCode, setBaseCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canViewSettings) return;
    setLoading(true);
    fetch('/api/settings/currencies')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Could not load currency settings');
        const records = result.data ?? [];
        setCurrencies(records);
        setBaseCode(records.find((currency: CurrencyRecord) => currency.isBase)?.code ?? '');
      })
      .catch((error) => toast({ title: lang === 'ar' ? 'تعذر تحميل العملات' : 'Could not load currencies', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [canViewSettings, lang]);

  function changeBase(nextBaseCode: string) {
    const currentBaseRate = Number(currencies.find((currency) => currency.code === nextBaseCode)?.exchangeRate);
    if (!Number.isFinite(currentBaseRate) || currentBaseRate <= 0) return;
    setCurrencies((current) => current.map((currency) => ({
      ...currency,
      exchangeRate: (Number(currency.exchangeRate) / currentBaseRate).toPrecision(10).replace(/\.?0+$/, ''),
      isBase: currency.code === nextBaseCode,
    })));
    setBaseCode(nextBaseCode);
  }

  function changeRate(code: string, exchangeRate: string) {
    setCurrencies((current) => current.map((currency) => currency.code === code ? { ...currency, exchangeRate } : currency));
  }

  async function saveCurrencies(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/settings/currencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseCode,
          rates: currencies
            .filter((currency) => currency.code !== baseCode)
            .map((currency) => ({ code: currency.code, exchangeRate: Number(currency.exchangeRate) })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not save currency settings');
      toast({ title: lang === 'ar' ? 'تم حفظ إعدادات العملات' : 'Currency settings saved' });
      setCurrencies((current) => current.map((currency) => ({ ...currency, isBase: currency.code === baseCode })));
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر حفظ العملات' : 'Could not save currencies', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lang === 'ar' ? 'تفضيلات حسابك وإعدادات النظام المسموح بها.' : 'Your account preferences and authorized system configuration.'}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{lang === 'ar' ? 'الحساب' : 'Account'}</CardTitle><CardDescription>{lang === 'ar' ? 'معلومات جلسة المستخدم الحالية.' : 'Details for the signed-in user.'}</CardDescription></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">{lang === 'ar' ? 'الاسم' : 'Name'}</span><span className="font-medium">{session?.user.name ?? '—'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span><span className="font-medium">{session?.user.email ?? '—'}</span></div>
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-muted-foreground">{lang === 'ar' ? 'الأدوار' : 'Roles'}</span><div className="flex flex-wrap gap-1">{(session?.user.roles ?? []).map((role) => <Badge key={role} variant="outline">{role.replaceAll('_', ' ')}</Badge>)}</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{lang === 'ar' ? 'تفضيلات العرض' : 'Display preferences'}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{lang === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}</Button>
          <Button type="button" variant="outline" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? (lang === 'ar' ? 'الوضع الفاتح' : 'Light mode') : (lang === 'ar' ? 'الوضع الداكن' : 'Dark mode')}</Button>
        </CardContent>
      </Card>

      {canViewSettings && (
        <Card>
          <CardHeader>
            <CardTitle>{lang === 'ar' ? 'العملات وأسعار الصرف' : 'Currencies and exchange rates'}</CardTitle>
            <CardDescription>{lang === 'ar'
              ? 'أدخل يدويًا عدد وحدات كل عملة مقابل وحدة واحدة من العملة الأساسية. لا يجلب النظام الأسعار تلقائيًا.'
              : 'Enter how many units of each currency equal one unit of the base currency. Rates are manual; this system does not fetch live market data.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : !canEditSettings ? (
              <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'لديك صلاحية العرض فقط.' : 'You have view-only access to these settings.'}</p>
            ) : (
              <form onSubmit={saveCurrencies} className="space-y-4">
                <div className="space-y-3">
                  {currencies.map((currency) => (
                    <div key={currency.code} className="grid items-center gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto]">
                      <Label htmlFor={`rate-${currency.code}`} className="flex items-center gap-2"><input type="radio" name="baseCurrency" checked={baseCode === currency.code} onChange={() => changeBase(currency.code)} />{currency.code} — {currency.name}</Label>
                      <Input id={`rate-${currency.code}`} type="number" min="0.00000001" step="any" required disabled={baseCode === currency.code} value={baseCode === currency.code ? '1' : currency.exchangeRate} onChange={(event) => changeRate(currency.code, event.target.value)} aria-label={`${currency.code} exchange rate`} />
                      <span className="text-xs text-muted-foreground">{baseCode === currency.code ? (lang === 'ar' ? 'العملة الأساسية' : 'Base currency') : `${currency.symbol} / ${baseCode || '—'}`}</span>
                    </div>
                  ))}
                </div>
                <Button type="submit" disabled={saving || currencies.length === 0 || !baseCode}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}{lang === 'ar' ? 'حفظ أسعار الصرف' : 'Save exchange rates'}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
