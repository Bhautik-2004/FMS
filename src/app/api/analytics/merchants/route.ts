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
      .select('merchant_name, amount, date, type')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startDate.toISOString().split('T')[0])
      .not('merchant_name', 'is', null)
      .order('date', { ascending: false });

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate by merchant
    const merchantMap = new Map();
    
    transactions?.forEach((tx: any) => {
      const merchantName = tx.merchant_name || 'Unknown';
      
      if (merchantMap.has(merchantName)) {
        const existing = merchantMap.get(merchantName);
        existing.total_spent += Number(tx.amount || 0);
        existing.transaction_count += 1;
        existing.last_transaction_date = tx.date > existing.last_transaction_date 
          ? tx.date 
          : existing.last_transaction_date;
        existing.first_transaction_date = tx.date < existing.first_transaction_date
          ? tx.date
          : existing.first_transaction_date;
      } else {
        merchantMap.set(merchantName, {
          merchant_name: merchantName,
          total_spent: Number(tx.amount || 0),
          transaction_count: 1,
          avg_transaction: 0,
          first_transaction_date: tx.date,
          last_transaction_date: tx.date,
        });
      }
    });

    // Calculate averages
    merchantMap.forEach((merchant) => {
      merchant.avg_transaction = merchant.total_spent / merchant.transaction_count;
    });

    // Convert to array and sort by total spent
    const merchantData = Array.from(merchantMap.values())
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 50); // Top 50 merchants

    return NextResponse.json({
      merchants: merchantData,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
