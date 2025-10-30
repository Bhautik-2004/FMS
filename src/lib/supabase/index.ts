/**
 * Supabase Client Exports
 * Centralized exports for all Supabase client utilities
 */

// Browser client (use in Client Components)
export { createClient as createBrowserClient } from './client';

// Server clients (use in Server Components, Route Handlers, and Server Actions)
export {
  createClient as createServerClient,
  createRouteHandlerClient,
  createServerActionClient,
} from './server';

// Middleware utilities
export { createClient as createMiddlewareClient, updateSession } from './middleware';

// Type exports
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './types';
