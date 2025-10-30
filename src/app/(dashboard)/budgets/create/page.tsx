import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreateBudgetForm } from '@/components/budgets/create-budget-form';

export const metadata = {
  title: 'Create Budget | FMS',
  description: 'Create a new budget',
};

export default async function CreateBudgetPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch expense categories
  const { data: categories = [] } = await (supabase as any)
    .from('categories')
    .select('*')
    .or(`user_id.eq.${user.id},is_system.eq.true`)
    .eq('type', 'expense')
    .order('name');

  // Get historical spending data for suggestions
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: historicalData } = await (supabase as any)
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

  // Calculate average spending per category
  const categoryAverages: Record<string, number> = {};
  if (historicalData) {
    const categorySums: Record<string, number[]> = {};
    
    historicalData.forEach((tx: any) => {
      if (tx.category_id) {
        if (!categorySums[tx.category_id]) {
          categorySums[tx.category_id] = [];
        }
        categorySums[tx.category_id].push(parseFloat(tx.amount));
      }
    });

    Object.keys(categorySums).forEach(categoryId => {
      const amounts = categorySums[categoryId];
      const avg = amounts.reduce((sum, amt) => sum + amt, 0) / 3; // 3 months
      categoryAverages[categoryId] = Math.round(avg);
    });
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <CreateBudgetForm
        categories={categories}
        historicalSpending={categoryAverages}
      />
    </div>
  );
}
