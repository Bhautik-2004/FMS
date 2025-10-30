import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TransactionsPageClient } from '@/components/transactions/transactions-page-client';

export const metadata = {
  title: 'Transactions | FMS',
  description: 'Manage your financial transactions',
};

export default async function TransactionsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch accounts for filters
  const { data: accounts = [] } = await (supabase as any)
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('name');

  // Fetch categories for filters
  const { data: categories = [] } = await (supabase as any)
    .from('categories')
    .select('*')
    .or(`user_id.eq.${user.id},is_system.eq.true`)
    .order('sort_order');

  // Fetch recent transactions (initial load)
  // Note: Not using joins until foreign keys are added
  const { data: transactionsRaw = [] } = await (supabase as any)
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  // Manually join account and category data
  const transactions = transactionsRaw.map((t: any) => {
    const account = accounts.find((a: any) => a.id === t.account_id);
    const category = categories.find((c: any) => c.id === t.category_id);
    
    return {
      ...t,
      account: account ? { name: account.name, type: account.type } : null,
      category: category ? { name: category.name, color: category.color, icon: category.icon } : null,
    };
  });

  // Fetch all unique tags
  const { data: tagData } = await (supabase as any)
    .from('transactions')
    .select('tags')
    .eq('user_id', user.id)
    .not('tags', 'is', null);

  // Extract unique tags
  const allTags = new Set<string>();
  tagData?.forEach((row: any) => {
    row.tags?.forEach((tag: string) => allTags.add(tag));
  });
  const tags = Array.from(allTags).sort();

  return (
    <TransactionsPageClient
      initialTransactions={transactions}
      accounts={accounts}
      categories={categories}
      tags={tags}
    />
  );
}
