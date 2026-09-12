/**
 * Next.js middleware — runs before every request in the edge runtime.
 *
 * Handles:
 *  1. Dynamic CORS origin — only echoes back origins in the allowlist.
 *     Prevents any malicious site from reading cross-origin responses
 *     (fixes the wildcard CORS + localStorage token issue where any site
 *     could forge requests from the user's browser).
 *  2. Preflight OPTIONS — short-circuits with 204.
 */

import { NextRequest, NextResponse } from 'next/server';

// Allowlist — resolved from env at request time (edge-compatible).
function getAllowedOrigins(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001';
  return raw.split(',').map((o) => o.trim());
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowed = getAllowedOrigins();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    if (origin && allowed.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
    }
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Crosssell-Token, X-Request-ID, X-Correlation-ID, x-csrf-token',
    );
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
  }

  const res = NextResponse.next();

  // Only set ACAO for allowlisted origins — never '*'
  if (origin && allowed.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
