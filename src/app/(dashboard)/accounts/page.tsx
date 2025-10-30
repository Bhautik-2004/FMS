import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AccountsPageClient } from '@/components/accounts/accounts-page-client';

export default async function AccountsPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch accounts
  const { data: accounts, error } = await (supabase as any)
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {

  }

  return <AccountsPageClient initialAccounts={accounts || []} />;
}
