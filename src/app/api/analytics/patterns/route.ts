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

    // Get transactions grouped by day of month to find peak expense day
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('date, amount, type')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (txError) {

      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Group by day of month
    const dayTotals = new Map<number, number>();
    transactions?.forEach((tx) => {
      const day = new Date(tx.date).getDate();
      const current = dayTotals.get(day) || 0;
      dayTotals.set(day, current + Number(tx.amount || 0));
    });

    // Find peak expense day
    let peakDay = 1;
    let peakAmount = 0;
    dayTotals.forEach((amount, day) => {
      if (amount > peakAmount) {
        peakAmount = amount;
        peakDay = day;
      }
    });

    // Get spending anomalies
    const { data: anomalies, error: anomalyError } = await supabase.rpc(
      'detect_spending_anomalies' as any,
      {
        p_user_id: user.id,
        p_category_id: null,
        p_lookback_months: period === '1M' ? 1 : period === '3M' ? 3 : 6,
      }
    );

    if (anomalyError) {

      // Don't fail the entire request if anomalies fail
    }

    return NextResponse.json({
      peakExpenseDay: {
        day: peakDay,
        totalAmount: peakAmount,
        label: `${peakDay}${getDaySuffix(peakDay)} of Month`,
      },
      dayBreakdown: Array.from(dayTotals.entries())
        .map(([day, amount]) => ({ day, amount }))
        .sort((a, b) => a.day - b.day),
      anomalies: anomalies || [],
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
