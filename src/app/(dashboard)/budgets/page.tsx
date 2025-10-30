import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BudgetsPageClient } from '@/components/budgets/budgets-page-client';

export const metadata = {
  title: 'Budgets | FMS',
  description: 'Manage your budgets and track spending',
};

export default async function BudgetsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Try to fetch budgets with summary data (tables may not exist yet)
  let budgets: any[] = [];
  let budgetCategories: any[] = [];
  let categories: any[] = [];
  let tablesExist = true;

  try {
    // Fetch budgets with summary data
    const { data: budgetData, error: budgetError } = await (supabase as any)
      .from('budget_summary')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    if (budgetError) {

      tablesExist = false;
    } else {
      budgets = budgetData || [];
    }

    // Fetch budget categories with performance metrics
    const { data: categoryData } = await (supabase as any)
      .from('budget_category_performance')
      .select('*')
      .eq('user_id', user.id);
    budgetCategories = categoryData || [];

    // Fetch categories for filter
    const { data: catData } = await (supabase as any)
      .from('categories')
      .select('*')
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .eq('type', 'expense')
      .order('name');
    categories = catData || [];
  } catch (error) {

    tablesExist = false;
  }

  return (
    <BudgetsPageClient
      budgets={budgets}
      budgetCategories={budgetCategories}
      categories={categories}
      tablesExist={tablesExist}
    />
  );
}
