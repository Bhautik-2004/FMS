import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

/**
 * Creates a Supabase client for use in middleware
 * This handles authentication state and session refresh
 * 
 * @param request - Next.js request object
 * @returns Object containing supabase client and response
 */
export async function createClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if expired - use getSession for more reliable check
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  const user = session?.user ?? null;

  return { supabase, response, user };
}

/**
 * Middleware helper to protect routes that require authentication
 * Redirects to login if user is not authenticated
 * 
 * @param request - Next.js request object
 * @param protectedPaths - Array of path patterns that require authentication
 * @returns NextResponse with redirect or next()
 */
export async function updateSession(
  request: NextRequest,
  protectedPaths: string[] = []
) {
  const { supabase, response, user } = await createClient(request);
  
  const pathname = request.nextUrl.pathname;

  // Define auth-only pages (should not be accessible when logged in)
  const authOnlyPaths = ['/login', '/signup', '/forgot-password'];
  const isAuthOnlyPath = authOnlyPaths.some((path) => pathname === path);
  
  // Redirect authenticated users away from auth pages to dashboard
  if (user && (isAuthOnlyPath || pathname === '/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Redirect to login if accessing protected route without authentication
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
