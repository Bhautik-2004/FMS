'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCurrency } from '@/contexts/currency-context';
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  IncomeExpensesChart,
  CategoryPieChart,
  CashFlowChart,
  TopCategoriesChart,
} from '@/components/dashboard/charts';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { QuickActions } from '@/components/dashboard/quick-actions';

export default function DashboardPage() {
  const supabase = createClient();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current date info
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Get previous month dates for comparison
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fetch accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const totalBalance = accounts?.reduce((sum, acc) => sum + acc.current_balance, 0) || 0;

      // Fetch current month transactions with explicit joins
      const { data: currentMonthTransactions } = await supabase
        .from('transactions')
        .select(`
          amount,
          type,
          category_id,
          date,
          description
        `)
        .eq('user_id', user.id)
        .gte('date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('date', lastDayOfMonth.toISOString().split('T')[0]);

      // Fetch last month transactions for comparison
      const { data: lastMonthTransactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user.id)
        .gte('date', firstDayOfLastMonth.toISOString().split('T')[0])
        .lte('date', lastDayOfLastMonth.toISOString().split('T')[0]);

      // Calculate current month totals
      const currentIncome = currentMonthTransactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const currentExpenses = currentMonthTransactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const currentSavings = currentIncome - currentExpenses;

      // Calculate last month totals
      const lastIncome = lastMonthTransactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const lastExpenses = lastMonthTransactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const lastSavings = lastIncome - lastExpenses;

      // Calculate percentage changes
      const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
      const expensesChange = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;
      const savingsChange = lastSavings > 0 ? ((currentSavings - lastSavings) / Math.abs(lastSavings)) * 100 : 0;

      // Get last 6 months for charts
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const { data: sixMonthsData } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Group by month
      const monthlyData: { [key: string]: { income: number; expenses: number; balance: number } } = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      sixMonthsData?.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${monthNames[date.getMonth()]}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expenses: 0, balance: 0 };
        }
        
        if (t.type === 'income') {
          monthlyData[monthKey].income += t.amount;
          monthlyData[monthKey].balance += t.amount;
        } else if (t.type === 'expense') {
          monthlyData[monthKey].expenses += t.amount;
          monthlyData[monthKey].balance -= t.amount;
        }
      });

      const incomeExpensesChartData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
      }));

      // Create mini chart data for stat cards (last 7 data points)
      const monthlyDataArray = Object.entries(monthlyData);
      const last7Months = monthlyDataArray.slice(-7);
      
      const balanceTrendData = last7Months.map(([_, data]) => ({
        value: data.balance,
      }));
      
      const incomeTrendData = last7Months.map(([_, data]) => ({
        value: data.income,
      }));
      
      const expensesTrendData = last7Months.map(([_, data]) => ({
        value: data.expenses,
      }));
      
      const savingsTrendData = last7Months.map(([_, data]) => ({
        value: data.income - data.expenses,
      }));

      // Category breakdown - fetch expenses and categories separately
      const { data: allExpenses, error: expenseError } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('user_id', user.id)
        .eq('type', 'expense');

      if (expenseError) {

      }

      // Fetch all categories (RLS policy will return system + user categories)
      const { data: allCategories, error: categoryError } = await supabase
        .from('categories')
        .select('id, name, color, icon, is_system');

      if (categoryError) {

      }



      const categoryMap = new Map(allCategories?.map(c => [c.id, c]) || []);
      const categoryTotals: { [key: string]: { name: string; value: number; color: string } } = {};
      
      (allExpenses || []).forEach(t => {
        const category = categoryMap.get(t.category_id || '');
        const categoryName = category?.name || 'Uncategorized';
        const categoryColor = category?.color || '#6b7280';

        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = {
            name: categoryName,
            value: 0,
            color: categoryColor,
          };
        }
        categoryTotals[categoryName].value += t.amount;
      });

      const categoryChartData = Object.values(categoryTotals);

      const topCategoriesChartData = Object.values(categoryTotals)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map(cat => ({ category: cat.name, amount: cat.value }));

      // Recent transactions (last 5 for dashboard) - fetch separately and join manually
      const { data: recentTx, error: txError } = await supabase
        .from('transactions')
        .select('id, date, description, amount, type, created_at, category_id, account_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txError) {

      }

      // Fetch accounts for the transactions
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user.id);

      const accountMap = new Map(accountsData?.map(a => [a.id, a]) || []);

      const recentTransactions = (recentTx || []).map(t => {
        const category = categoryMap.get(t.category_id || '');
        const categoryName = category?.name || 'Uncategorized';
        const categoryColor = category?.color || '#6b7280';
        const categoryIcon = category?.icon || null;
        const accountName = accountMap.get(t.account_id || '')?.name || 'Unknown';
        
        return {
          id: t.id,
          date: t.date,
          description: t.description || 'No description',
          category: categoryName,
          categoryColor: categoryColor,
          categoryIcon: categoryIcon,
          amount: t.amount,
          account: accountName,
          type: (t.type === 'income' || t.type === 'expense') ? t.type : 'expense',
        };
      });

      setDashboardData({
        totalBalance,
        currentIncome,
        currentExpenses,
        currentSavings,
        incomeChange,
        expensesChange,
        savingsChange,
        incomeExpensesChartData,
        categoryChartData,
        topCategoriesChartData,
        recentTransactions,
        balanceTrendData,
        incomeTrendData,
        expensesTrendData,
        savingsTrendData,
      });
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  const statCardsData = [
    {
      title: 'Total Balance',
      value: formatCurrency(dashboardData.totalBalance),
      change: 0,
      changeLabel: 'across all accounts',
      icon: <DollarSign className="h-4 w-4" />,
      data: dashboardData.balanceTrendData || [],
      positive: true,
    },
    {
      title: 'Monthly Income',
      value: `+${formatCurrency(dashboardData.currentIncome)}`,
      change: dashboardData.incomeChange,
      changeLabel: 'from last month',
      icon: <TrendingUp className="h-4 w-4" />,
      data: dashboardData.incomeTrendData || [],
      positive: dashboardData.incomeChange >= 0,
    },
    {
      title: 'Monthly Expenses',
      value: `-${formatCurrency(dashboardData.currentExpenses)}`,
      change: Math.abs(dashboardData.expensesChange),
      changeLabel: 'from last month',
      icon: <TrendingDown className="h-4 w-4" />,
      data: dashboardData.expensesTrendData || [],
      positive: dashboardData.expensesChange < 0,
    },
    {
      title: 'Net Savings',
      value: `${dashboardData.currentSavings >= 0 ? '+' : '-'}${formatCurrency(Math.abs(dashboardData.currentSavings))}`,
      change: Math.abs(dashboardData.savingsChange),
      changeLabel: 'from last month',
      icon: <PiggyBank className="h-4 w-4" />,
      data: dashboardData.savingsTrendData || [],
      positive: dashboardData.currentSavings >= 0,
    },
  ];

  // Create cash flow data (simplified - using monthly trend)
  const cashFlowData = dashboardData.incomeExpensesChartData.map((item: any, index: number) => ({
    date: item.month,
    balance: dashboardData.totalBalance - (dashboardData.incomeExpensesChartData.length - index - 1) * 1000,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your finances.
        </p>
      </div>

      {/* Quick Actions Bar (Desktop) */}
      <QuickActions />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCardsData.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <IncomeExpensesChart data={dashboardData.incomeExpensesChartData} />
        <CategoryPieChart data={dashboardData.categoryChartData} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <CashFlowChart data={cashFlowData} />
        <TopCategoriesChart data={dashboardData.topCategoriesChartData} />
      </div>

      {/* Recent Transactions */}
      <div className="grid gap-4">
        <RecentTransactions transactions={dashboardData.recentTransactions} />
      </div>
    </div>
  );
}
