# Supabase Migrations

This directory contains database migrations for the FMS application.

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to Your Project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

You can find your project ID in the Supabase dashboard URL:
`https://app.supabase.com/project/YOUR_PROJECT_ID`

## Applying Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Push migrations to your remote Supabase project
supabase db push

# Or apply a specific migration
supabase migration up
```

### Option 2: Using SQL Editor in Supabase Dashboard

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Paste and execute the SQL

### Option 3: Manual Application

If you prefer to apply migrations manually:

1. Open the Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the SQL from `migrations/20250101000000_create_user_profiles.sql`
4. Execute the query

## Generating Types

After applying migrations, generate TypeScript types:

```bash
# Generate types and save to types file
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
```

Or use the local database:

```bash
supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

## Migration Files

### `20250101000000_create_user_profiles.sql`

Creates the `user_profiles` table with:

**Schema:**
- `id` - UUID primary key (references auth.users)
- `email` - Text (not null)
- `full_name` - Text (nullable)
- `avatar_url` - Text (nullable)
- `currency` - Text (default 'USD')
- `date_format` - Text (default 'MM/DD/YYYY')
- `timezone` - Text (default 'UTC')
- `created_at` - Timestamp (auto-generated)
- `updated_at` - Timestamp (auto-updated via trigger)

**Features:**
- Row Level Security (RLS) enabled
- Users can only read/update their own profile
- Automatic profile creation on user signup
- Automatic `updated_at` timestamp updates
- Realtime subscriptions enabled
- Email index for faster lookups

## Using the Types in Your Code

```typescript
import { UserProfile, UserProfileInsert, UserProfileUpdate } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Fetch user profile
const { data: profile, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Update profile
const update: UserProfileUpdate = {
  full_name: 'John Doe',
  currency: 'EUR'
};

const { error: updateError } = await supabase
  .from('user_profiles')
  .update(update)
  .eq('id', userId);

// Subscribe to profile changes (realtime)
const subscription = supabase
  .channel('profile_changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'user_profiles',
    filter: `id=eq.${userId}`
  }, (payload) => {
    console.log('Profile updated:', payload.new);
  })
  .subscribe();
```

## Environment Variables

Make sure you have the following in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Local Development with Supabase

### Start Local Supabase

```bash
supabase start
```

### Stop Local Supabase

```bash
supabase stop
```

### Reset Local Database

```bash
supabase db reset
```

## Creating New Migrations

```bash
# Create a new migration file
supabase migration new migration_name

# This will create a new file in supabase/migrations/
# Edit the file and add your SQL
```

## Best Practices

1. **Always test migrations locally first** using `supabase start` and `supabase db reset`
2. **Generate types after each migration** to keep TypeScript definitions in sync
3. **Use Row Level Security (RLS)** for all tables to ensure data security
4. **Add indexes** for columns used in WHERE clauses or JOINs
5. **Use triggers** for automatic timestamp updates
6. **Enable realtime** only for tables that need it (to save resources)

## Troubleshooting

### Migration fails with "relation already exists"

The migration includes `IF NOT EXISTS` clauses, but if you need to reapply:

```bash
# Reset local database
supabase db reset

# Or drop the table manually in SQL Editor
DROP TABLE IF EXISTS public.user_profiles CASCADE;
```

### Types not updating

Make sure to:
1. Apply the migration first
2. Generate types with the correct project ID
3. Restart TypeScript server in VS Code (Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server")

### RLS policies not working

Check that:
1. RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Policies are created correctly
3. You're using the correct Supabase client (authenticated)

## Resources

- [Supabase Migrations Documentation](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Supabase TypeScript Support](https://supabase.com/docs/guides/api/generating-types)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)
