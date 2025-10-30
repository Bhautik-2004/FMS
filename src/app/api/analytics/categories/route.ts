import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6M';
    
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1M':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'ALL':
        startDate.setFullYear(startDate.getFullYear() - 10);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 6);
    }

    // Query transactions directly for real-time accurate data
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('category_id, amount, type')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch all categories separately
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, icon, color, type');

    if (catError) {

      return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    // Create category lookup map
    const categoryLookup = new Map();
    categories?.forEach(cat => {
      categoryLookup.set(cat.id, cat);
    });

    // Aggregate by category
    const categoryMap = new Map();
    
    transactions?.forEach((tx: any) => {
      if (!tx.category_id) return;
      
      const category = categoryLookup.get(tx.category_id);
      if (!category) return;
      
      const key = tx.category_id;
      if (categoryMap.has(key)) {
        const existing = categoryMap.get(key);
        existing.total_amount += Number(tx.amount || 0);
        existing.transaction_count += 1;
      } else {
        categoryMap.set(key, {
          category_id: tx.category_id,
          category_name: category.name,
          category_icon: category.icon,
          category_color: category.color,
          category_type: tx.type,
          total_amount: Number(tx.amount || 0),
          transaction_count: 1,
        });
      }
    });

    const aggregated = Array.from(categoryMap.values())
      .sort((a, b) => b.total_amount - a.total_amount);

    // Find top spending category (expenses only)
    const topExpenseCategory = aggregated.find(c => c.category_type === 'expense');

    return NextResponse.json({
      categories: aggregated,
      topSpending: topExpenseCategory ? {
        name: topExpenseCategory.category_name,
        amount: topExpenseCategory.total_amount,
        count: topExpenseCategory.transaction_count,
      } : null,
      rawData: aggregated,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
