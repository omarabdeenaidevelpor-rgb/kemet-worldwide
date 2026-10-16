'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[UI ERROR]', error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-orange-500" aria-hidden />
      <h1 className="text-xl font-semibold">حدث خطأ غير متوقع — Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        حاول مرة أخرى. إذا استمرت المشكلة تواصل مع مدير النظام.
        {error.digest && <span className="mt-2 block font-mono text-xs">ref: {error.digest}</span>}
      </p>
      <Button onClick={reset}>
        <RotateCcw className="me-2 h-4 w-4" /> إعادة المحاولة / Retry
      </Button>
    </main>
  );
}
