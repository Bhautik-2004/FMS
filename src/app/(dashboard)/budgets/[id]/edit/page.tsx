import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditBudgetForm } from '@/components/budgets';

export const metadata = {
  title: 'Edit Budget | FMS',
  description: 'Edit your budget',
};

interface EditBudgetPageProps {
  params: {
    id: string;
  };
}

export default async function EditBudgetPage({ params }: EditBudgetPageProps) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch budget
  const { data: budget, error: budgetError } = await (supabase as any)
    .from('budgets')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (budgetError || !budget) {
    notFound();
  }

  // Fetch budget categories
  const { data: budgetCategories = [] } = await (supabase as any)
    .from('budget_categories')
    .select(`
      *,
      category:categories(id, name, icon, color)
    `)
    .eq('budget_id', params.id);

  // Fetch all expense categories for adding new allocations
  const { data: categories = [] } = await (supabase as any)
    .from('categories')
    .select('*')
    .or(`user_id.eq.${user.id},is_system.eq.true`)
    .eq('type', 'expense')
    .order('name');

  // Calculate historical spending averages (last 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: historicalData = [] } = await (supabase as any)
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

  // Group by category and calculate averages
  const categorySums: Record<string, number[]> = {};
  historicalData.forEach((tx: any) => {
    if (tx.category_id) {
      if (!categorySums[tx.category_id]) {
        categorySums[tx.category_id] = [];
      }
      categorySums[tx.category_id].push(parseFloat(tx.amount));
    }
  });

  const historicalSpending: Record<string, number> = {};
  Object.entries(categorySums).forEach(([categoryId, amounts]) => {
    const avg = amounts.reduce((sum, amt) => sum + amt, 0) / 3; // Average over 3 months
    historicalSpending[categoryId] = Math.round(avg);
  });

  return (
    <EditBudgetForm
      budget={budget}
      budgetCategories={budgetCategories}
      categories={categories}
      historicalSpending={historicalSpending}
    />
  );
}
