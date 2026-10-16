import { cn } from '@/lib/utils';

/**
 * Official KEMET Worldwide logo (vectorised from the brand artwork).
 *  - variant="color"  : navy + gray, for light backgrounds
 *  - variant="white"  : white, for the navy sidebar / dark backgrounds
 *  - variant="auto"   : color in light mode, white in dark mode
 *  - iconOnly         : just the square emblem
 */
export function BrandLogo({
  variant = 'auto',
  iconOnly = false,
  className,
  priority = false,
}: {
  variant?: 'color' | 'white' | 'auto';
  iconOnly?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const loading = priority ? 'eager' : 'lazy';
  if (iconOnly) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/logo-icon.svg" alt="KEMET" className={cn('h-9 w-9', className)} loading={loading} />
    );
  }
  if (variant === 'auto') {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="KEMET Worldwide" className={cn('h-10 w-auto dark:hidden', className)} loading={loading} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.svg" alt="KEMET Worldwide" className={cn('hidden h-10 w-auto dark:block', className)} loading={loading} />
      </>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={variant === 'white' ? '/logo-white.svg' : '/logo.svg'}
      alt="KEMET Worldwide"
      className={cn('h-10 w-auto', className)}
      loading={loading}
    />
  );
}
