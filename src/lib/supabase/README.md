# Supabase Integration for Next.js 14

This directory contains type-safe Supabase client implementations for Next.js 14 with App Router.

## Setup

### 1. Environment Variables

Add your Supabase credentials to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from: https://app.supabase.com/project/_/settings/api

### 2. Generate Database Types (Optional but Recommended)

To get full type safety, generate types from your Supabase database:

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Generate types
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
```

## Usage

### Client Components (Browser)

Use `createBrowserClient` in Client Components:

```tsx
'use client';

import { createBrowserClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function ClientComponent() {
  const [data, setData] = useState<any>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('your_table').select('*');
      setData(data);
    }
    fetchData();
  }, [supabase]);

  return <div>{/* Your component */}</div>;
}
```

### Server Components

Use `createServerClient` in Server Components:

```tsx
import { createServerClient } from '@/lib/supabase';

export default async function ServerComponent() {
  const supabase = await createServerClient();
  const { data } = await supabase.from('your_table').select('*');

  return <div>{/* Your component */}</div>;
}
```

### Route Handlers (API Routes)

Use `createRouteHandlerClient` in API routes:

```typescript
import { createRouteHandlerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase.from('your_table').select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### Server Actions

Use `createServerActionClient` in Server Actions:

```typescript
'use server';

import { createServerActionClient } from '@/lib/supabase';

export async function createItem(formData: FormData) {
  const supabase = await createServerActionClient();
  const name = formData.get('name') as string;

  const { data, error } = await supabase
    .from('your_table')
    .insert({ name })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
```

### Authentication Example

#### Sign Up

```typescript
'use server';

import { createServerActionClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createServerActionClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  redirect('/login?message=Check your email to confirm your account');
}
```

#### Sign In

```typescript
'use server';

import { createServerActionClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createServerActionClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  redirect('/dashboard');
}
```

#### Sign Out

```typescript
'use server';

import { createServerActionClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createServerActionClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

#### Get Current User

```typescript
import { createServerClient } from '@/lib/supabase';

export default async function Profile() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <div>Welcome, {user.email}</div>;
}
```

## Middleware

The middleware automatically:
- Refreshes expired authentication sessions
- Protects routes that require authentication
- Redirects unauthenticated users to login
- Redirects authenticated users away from login/signup pages

To customize protected routes, edit `middleware.ts` in the root directory:

```typescript
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/settings',
  // Add more protected routes here
];
```

## Type Safety

All clients are fully typed with your database schema. The helper types make it easy to work with your data:

```typescript
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase';

// Get row type
type User = Tables<'users'>;

// Get insert type
type NewUser = TablesInsert<'users'>;

// Get update type
type UserUpdate = TablesUpdate<'users'>;
```

## Files

- `client.ts` - Browser client for Client Components
- `server.ts` - Server clients for Server Components, Route Handlers, and Server Actions
- `middleware.ts` - Middleware utilities for authentication
- `types.ts` - Database type definitions
- `index.ts` - Centralized exports

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase + Next.js Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Next.js 14 Documentation](https://nextjs.org/docs)
