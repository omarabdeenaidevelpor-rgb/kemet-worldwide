import type { MetadataRoute } from 'next';

// Internal business system — disallow all crawlers.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
