import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';

// Initialize a simple in-memory cache for rate limiting.
// Note: This is per-isolate (per-server instance) and will not be synchronized globally.
const rateLimitCache = new LRUCache<string, number>({
  max: 1000,
  ttl: 60 * 1000, // 1 minute
});

const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

export function middleware(req: NextRequest) {
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isServerAction = req.method === 'POST' && req.headers.has('next-action');

  if (isApiRoute || isServerAction) {
    const ip = req.ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    const currentUsage = rateLimitCache.get(ip) || 0;
    
    if (currentUsage >= RATE_LIMIT_MAX_REQUESTS) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Too Many Requests. Please slow down.' }, { status: 429 });
      } else {
        return new NextResponse('Too Many Requests', { status: 429 });
      }
    }
    
    rateLimitCache.set(ip, currentUsage + 1);
  }

  return NextResponse.next();
}

export const config = {
  // Match all request paths except static files, images, favicon, etc.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
