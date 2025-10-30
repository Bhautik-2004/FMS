'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BudgetProgress } from './BudgetProgress';
import { BudgetAlerts } from './BudgetAlerts';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertCircle,
  Zap,
  ArrowRight,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface BudgetSummary {
  budget_id: string;
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  total_allocated: number;
  total_spent: number;
  spent_percentage: number;
  category_count: number;
  over_budget_count: number;
}

interface BudgetDashboardWidgetProps {
  budgets?: BudgetSummary[];
  alerts?: any[];
  showAlerts?: boolean;
  showQuickActions?: boolean;
}

export function BudgetDashboardWidget({
  budgets: initialBudgets = [],
  alerts: initialAlerts = [],
  showAlerts = true,
  showQuickActions = true,
}: BudgetDashboardWidgetProps) {
  const router = useRouter();
  const supabase = createClient();

  const [budgets, setBudgets] = useState<BudgetSummary[]>(initialBudgets);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  // Calculate overall budget health score
  const calculateHealthScore = () => {
    if (budgets.length === 0) return 100;

    let totalScore = 0;
    budgets.forEach(budget => {
      let score = 100;
      
      // Penalize based on spending percentage
      if (budget.spent_percentage >= 100) {
        score -= 50;
      } else if (budget.spent_percentage >= 90) {
        score -= 30;
      } else if (budget.spent_percentage >= 70) {
        score -= 15;
      }
      
      // Penalize for over-budget categories
      if (budget.over_budget_count > 0) {
        score -= budget.over_budget_count * 10;
      }
      
      totalScore += Math.max(score, 0);
    });

    return Math.round(totalScore / budgets.length);
  };

  const healthScore = calculateHealthScore();
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Attention';
    return 'Critical';
  };

  // Calculate spending velocity
  const calculateSpendingVelocity = () => {
    if (budgets.length === 0) return 0;

    const activeBudgets = budgets.filter(b => {
      const today = new Date();
      const endDate = new Date(b.end_date);
      return endDate >= today;
    });

    if (activeBudgets.length === 0) return 0;

    let totalVelocity = 0;
    activeBudgets.forEach(budget => {
      const today = new Date();
      const startDate = new Date(budget.start_date);
      const endDate = new Date(budget.end_date);
      
      const totalDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysPercentage = Math.min(100, (daysElapsed / totalDays) * 100);
      
      const expectedSpending = (budget.total_allocated * daysPercentage) / 100;
      const velocity = budget.total_spent - expectedSpending;
      totalVelocity += velocity;
    });

    return totalVelocity / activeBudgets.length;
  };

  const spendingVelocity = calculateSpendingVelocity();
  const isOverpacing = spendingVelocity > 0;

  // Calculate totals
  const totalAllocated = budgets.reduce((sum, b) => sum + b.total_allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.total_spent, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  // Count budgets by status
  const goodBudgets = budgets.filter(b => b.spent_percentage < 70).length;
  const warningBudgets = budgets.filter(b => b.spent_percentage >= 70 && b.spent_percentage < 90).length;
  const criticalBudgets = budgets.filter(b => b.spent_percentage >= 90).length;

  // Setup real-time subscriptions
  useEffect(() => {
    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to transactions table for real-time budget updates
      const channel = supabase
        .channel('budget-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {

            await refreshBudgets();
            toast.info('Budgets updated', {
              description: 'Your budget data has been refreshed',
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'budget_alerts',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {

            await refreshAlerts();
          }
        )
        .subscribe();

      setRealtimeChannel(channel);
    };

    setupRealtimeSubscriptions();

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  // Refresh budgets
  const refreshBudgets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('budget_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (error) throw error;
      if (data) setBudgets(data);
    } catch (error) {

    }
  };

  // Refresh alerts
  const refreshAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('budget_alerts')
        .select(`
          *,
          budget:budgets(name, period_type)
        `)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data) setAlerts(data);
    } catch (error) {

    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshBudgets(), refreshAlerts()]);
    toast.success('Budget data refreshed');
    setIsRefreshing(false);
  };

  if (budgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Budget Dashboard
          </CardTitle>
          <CardDescription>Track your spending across all budgets</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No active budgets</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first budget to start tracking your spending
          </p>
          <Link href="/budgets/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Budget Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Budget Dashboard
              </CardTitle>
              <CardDescription>
                Real-time overview of your spending
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Link href="/budgets">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Health Score */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Budget Health Score</p>
              <div className="flex items-center gap-3">
                <p className={`text-4xl font-bold ${getHealthColor(healthScore)}`}>
                  {healthScore}
                </p>
                <div>
                  <p className={`text-sm font-medium ${getHealthColor(healthScore)}`}>
                    {getHealthLabel(healthScore)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Based on {budgets.length} budget{budgets.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2 text-sm">
                {goodBudgets > 0 && (
                  <Badge variant="outline" className="border-green-500 text-green-700">
                    {goodBudgets} Good
                  </Badge>
                )}
                {warningBudgets > 0 && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                    {warningBudgets} Warning
                  </Badge>
                )}
                {criticalBudgets > 0 && (
                  <Badge variant="destructive">
                    {criticalBudgets} Critical
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Total Allocated</span>
              </div>
              <p className="text-2xl font-bold">
                ${totalAllocated.toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                <span>Total Spent</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                ${totalSpent.toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Remaining</span>
              </div>
              <p className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(totalRemaining).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>Velocity</span>
              </div>
              <div className="flex items-center gap-2">
                {isOverpacing ? (
                  <TrendingUp className="h-5 w-5 text-red-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-green-500" />
                )}
                <p className={`text-2xl font-bold ${isOverpacing ? 'text-red-600' : 'text-green-600'}`}>
                  {isOverpacing ? '+' : '-'}${Math.abs(spendingVelocity).toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {isOverpacing ? 'Over pace' : 'Under pace'}
              </p>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{overallPercentage.toFixed(1)}%</span>
            </div>
            <Progress
              value={Math.min(overallPercentage, 100)}
              className="h-3"
              indicatorClassName={
                overallPercentage >= 100
                  ? 'bg-red-600'
                  : overallPercentage >= 90
                  ? 'bg-red-500'
                  : overallPercentage >= 70
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }
            />
          </div>

          {/* Active Budgets */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Active Budgets</h4>
            <div className="space-y-3">
              {budgets.slice(0, 3).map(budget => (
                <BudgetProgress
                  key={budget.budget_id}
                  budget={{
                    id: budget.budget_id,
                    name: budget.name,
                    period_type: budget.period_type,
                    start_date: budget.start_date,
                    end_date: budget.end_date,
                    total_amount: budget.total_amount,
                    total_allocated: budget.total_allocated,
                    total_spent: budget.total_spent,
                    spent_percentage: budget.spent_percentage,
                    category_count: budget.category_count,
                  }}
                  compact
                />
              ))}
            </div>
            {budgets.length > 3 && (
              <Link href="/budgets">
                <Button variant="ghost" className="w-full" size="sm">
                  View {budgets.length - 3} more budget{budgets.length - 3 !== 1 ? 's' : ''}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          {/* Quick Actions */}
          {showQuickActions && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <Link href="/budgets/create" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Budget
                </Button>
              </Link>
              <Link href="/transactions/add" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </Link>
              <Link href="/budgets" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  Adjust Budgets
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Alerts */}
      {showAlerts && alerts.length > 0 && (
        <BudgetAlerts alerts={alerts} compact showSettings />
      )}
    </div>
  );
}
