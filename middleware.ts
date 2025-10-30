import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Middleware to handle Supabase authentication
 * Automatically refreshes user sessions and protects routes
 */
export async function middleware(request: NextRequest) {
  // Define protected routes that require authentication
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/settings',
    '/transactions',
    '/budgets',
    '/categories',
    '/accounts',
    '/analytics',
    '/goals',
    '/recurring',
    '/insights',
  ];

  return await updateSession(request, protectedPaths);
}

/**
 * Matcher configuration for middleware
 * Excludes static files and API routes from middleware processing
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
