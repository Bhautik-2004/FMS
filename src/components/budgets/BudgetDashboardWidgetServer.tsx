import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BudgetDashboardWidget } from '@/components/budgets/BudgetDashboardWidget';

/**
 * Budget Dashboard Widget Server Component
 * 
 * Fetches budget data and alerts from Supabase and passes to client component
 * with real-time subscription support
 */
export async function BudgetDashboardWidgetServer() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Try to fetch budget data (tables may not exist yet)
  let budgets: any[] = [];
  let alerts: any[] = [];
  let tablesExist = true;

  try {
    // Fetch active budgets with summary data
    const { data: budgetData, error: budgetError } = await (supabase as any)
      .from('budget_summary')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(10);

    if (budgetError) {

      tablesExist = false;
    } else {
      budgets = budgetData || [];
    }

    // Fetch unread alerts
    const { data: alertData, error: alertError } = await (supabase as any)
      .from('budget_alerts')
      .select(`
        *,
        budget:budgets(name, period_type),
        category:categories(name, icon, color)
      `)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!alertError && alertData) {
      alerts = alertData;
    }
  } catch (error) {

    tablesExist = false;
  }

  // Don't render if tables don't exist
  if (!tablesExist) {
    return null;
  }

  // Don't render if no budgets
  if (budgets.length === 0) {
    return null;
  }

  return (
    <BudgetDashboardWidget
      budgets={budgets}
      alerts={alerts}
      showAlerts={true}
      showQuickActions={true}
    />
  );
}
