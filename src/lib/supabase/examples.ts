/**
 * Example usage of Supabase clients
 * This file demonstrates how to use the different Supabase clients
 */

// ============================================
// CLIENT COMPONENT EXAMPLE
// ============================================
/*
'use client';

import { createBrowserClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function ExampleClientComponent() {
  const [data, setData] = useState<any>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('your_table')
        .select('*');
      
      if (error) {

        return;
      }
      
      setData(data);
    }
    
    fetchData();
  }, [supabase]);

  return (
    <div>
      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
*/

// ============================================
// SERVER COMPONENT EXAMPLE
// ============================================
/*
import { createServerClient } from '@/lib/supabase';

export default async function ExampleServerComponent() {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('your_table')
    .select('*');

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Data from Server Component</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
*/

// ============================================
// SERVER ACTION EXAMPLE
// ============================================
/*
'use server';

import { createServerActionClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createItem(formData: FormData) {
  const supabase = await createServerActionClient();
  const name = formData.get('name') as string;

  const { data, error } = await supabase
    .from('your_table')
    .insert({ name })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/your-page');
  return data;
}

export async function updateItem(id: string, formData: FormData) {
  const supabase = await createServerActionClient();
  const name = formData.get('name') as string;

  const { data, error } = await supabase
    .from('your_table')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/your-page');
  return data;
}

export async function deleteItem(id: string) {
  const supabase = await createServerActionClient();

  const { error } = await supabase
    .from('your_table')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/your-page');
}
*/

// ============================================
// ROUTE HANDLER EXAMPLE
// ============================================
/*
import { createRouteHandlerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createRouteHandlerClient();
  
  const { data, error } = await supabase
    .from('your_table')
    .select('*');

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createRouteHandlerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('your_table')
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
*/

// ============================================
// AUTHENTICATION EXAMPLES
// ============================================
/*
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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect('/login?message=Check your email to confirm your account');
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createServerActionClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createServerActionClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getCurrentUser() {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
*/

export {};
