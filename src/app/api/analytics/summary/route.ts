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
        startDate.setFullYear(startDate.getFullYear() - 10); // Go back 10 years for "all"
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 6);
    }

    // Query transactions directly for real-time accurate data
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('date, type, amount')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by month
    const monthlyDataMap = new Map<string, any>();
    
    transactions?.forEach(t => {
      const monthKey = t.date.substring(0, 7); // YYYY-MM format
      
      if (!monthlyDataMap.has(monthKey)) {
        monthlyDataMap.set(monthKey, {
          month: `${monthKey}-01`,
          total_income: 0,
          total_expenses: 0,
          net_savings: 0,
          savings_rate: 0,
          income_transaction_count: 0,
          expense_transaction_count: 0,
          total_transactions: 0,
        });
      }
      
      const monthData = monthlyDataMap.get(monthKey)!;
      
      if (t.type === 'income') {
        monthData.total_income += Number(t.amount);
        monthData.income_transaction_count += 1;
      } else if (t.type === 'expense') {
        monthData.total_expenses += Number(t.amount);
        monthData.expense_transaction_count += 1;
      }
      
      monthData.total_transactions += 1;
    });

    // Calculate savings and savings rate for each month
    monthlyDataMap.forEach((monthData) => {
      monthData.net_savings = monthData.total_income - monthData.total_expenses;
      monthData.savings_rate = monthData.total_income > 0
        ? ((monthData.net_savings / monthData.total_income) * 100)
        : 0;
    });

    // Convert to array and sort by month descending
    const typedData = Array.from(monthlyDataMap.values())
      .sort((a, b) => b.month.localeCompare(a.month));

    // Calculate aggregated metrics
    const totalMonths = typedData.length || 0;
    
    const avgMonthlyIncome = totalMonths > 0
      ? typedData.reduce((sum, m) => sum + Number(m.total_income || 0), 0) / totalMonths
      : 0;
    
    const avgMonthlyExpenses = totalMonths > 0
      ? typedData.reduce((sum, m) => sum + Number(m.total_expenses || 0), 0) / totalMonths
      : 0;
    
    const avgSavingsRate = totalMonths > 0
      ? typedData.reduce((sum, m) => sum + Number(m.savings_rate || 0), 0) / totalMonths
      : 0;

    // Calculate trend (compare first half vs second half of period)
    const midPoint = Math.floor(totalMonths / 2);
    const recentHalf = typedData.slice(0, midPoint) || [];
    const olderHalf = typedData.slice(midPoint) || [];
    
    const recentAvgIncome = recentHalf.length > 0
      ? recentHalf.reduce((sum, m) => sum + Number(m.total_income || 0), 0) / recentHalf.length
      : 0;
    
    const olderAvgIncome = olderHalf.length > 0
      ? olderHalf.reduce((sum, m) => sum + Number(m.total_income || 0), 0) / olderHalf.length
      : 0;
    
    const incomeChange = olderAvgIncome > 0
      ? ((recentAvgIncome - olderAvgIncome) / olderAvgIncome) * 100
      : 0;

    const recentAvgExpenses = recentHalf.length > 0
      ? recentHalf.reduce((sum, m) => sum + Number(m.total_expenses || 0), 0) / recentHalf.length
      : 0;
    
    const olderAvgExpenses = olderHalf.length > 0
      ? olderHalf.reduce((sum, m) => sum + Number(m.total_expenses || 0), 0) / olderHalf.length
      : 0;
    
    const expenseChange = olderAvgExpenses > 0
      ? ((recentAvgExpenses - olderAvgExpenses) / olderAvgExpenses) * 100
      : 0;

    const recentAvgSavings = recentHalf.length > 0
      ? recentHalf.reduce((sum, m) => sum + Number(m.savings_rate || 0), 0) / recentHalf.length
      : 0;
    
    const olderAvgSavings = olderHalf.length > 0
      ? olderHalf.reduce((sum, m) => sum + Number(m.savings_rate || 0), 0) / olderHalf.length
      : 0;
    
    const savingsChange = olderAvgSavings > 0
      ? ((recentAvgSavings - olderAvgSavings) / olderAvgSavings) * 100
      : 0;

    return NextResponse.json({
      summary: {
        avgMonthlyIncome,
        avgMonthlyExpenses,
        avgSavingsRate,
        incomeChange,
        expenseChange,
        savingsChange,
        totalMonths,
      },
      monthlyData: typedData,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
