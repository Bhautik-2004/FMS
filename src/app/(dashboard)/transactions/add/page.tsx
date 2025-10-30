import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AddTransactionForm } from '@/components/transactions/add-transaction-form';

export const metadata = {
  title: 'Add Transaction | FMS',
  description: 'Add a new financial transaction',
};

export default async function AddTransactionPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch accounts
  const { data: accounts = [] } = await (supabase as any)
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('name');

  // Fetch categories
  const { data: categories = [] } = await (supabase as any)
    .from('categories')
    .select('*')
    .or(`user_id.eq.${user.id},is_system.eq.true`)
    .order('sort_order');

  // Fetch recent merchants for autocomplete
  const { data: recentTransactions = [] } = await (supabase as any)
    .from('transactions')
    .select('merchant_name, description')
    .eq('user_id', user.id)
    .not('merchant_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  // Extract unique merchants and descriptions
  const merchants = Array.from(new Set(
    recentTransactions
      .map((t: any) => t.merchant_name)
      .filter(Boolean)
  )) as string[];

  const descriptions = Array.from(new Set(
    recentTransactions
      .map((t: any) => t.description)
      .filter(Boolean)
  )) as string[];

  // Fetch tags
  const { data: tagData } = await (supabase as any)
    .from('transactions')
    .select('tags')
    .eq('user_id', user.id)
    .not('tags', 'is', null);

  const allTags = new Set<string>();
  tagData?.forEach((row: any) => {
    row.tags?.forEach((tag: string) => allTags.add(tag));
  });
  const tags = Array.from(allTags).sort();

  return (
    <div className="container mx-auto py-6">
      <AddTransactionForm
        accounts={accounts}
        categories={categories}
        merchants={merchants}
        descriptions={descriptions}
        tags={tags}
      />
    </div>
  );
}
