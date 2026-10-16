import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <SearchX className="h-12 w-12 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">الصفحة غير موجودة — Page not found</h1>
      <Link href="/dashboard" className="text-sm font-medium text-primary underline underline-offset-4">
        العودة للوحة التحكم / Back to dashboard
      </Link>
    </main>
  );
}
