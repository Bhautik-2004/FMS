'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Calendar,
  Filter,
  RefreshCw,
  Activity,
  PieChart,
  LineChart,
  Store,
  CreditCard,
  Target,
  Loader2,
  FileText,
  X,
} from 'lucide-react';
import { useCurrency } from '@/contexts/currency-context';
import { useAnalytics, TimePeriod } from '@/hooks/use-analytics';
import { createClient } from '@/lib/supabase/client';

// Import analytics components
import {
  FinancialHealthScore,
  IncomeExpensesChart,
  CategoryAnalytics,
  SpendingPatterns,
  MerchantAnalytics,
  AccountAnalytics,
  CustomReports,
} from '.';

interface KeyMetric {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface AnalyticsFilters {
  accountIds: string[];
  categoryIds: string[];
  transactionTypes: ('income' | 'expense' | 'transfer')[];
}

export function AnalyticsPageClient() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('6M');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const { formatCurrency } = useCurrency();
  
  // Filter state
  const [filters, setFilters] = useState<AnalyticsFilters>({
    accountIds: [],
    categoryIds: [],
    transactionTypes: [],
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Fetch real analytics data
  const { summary, topSpending, peakExpenseDay, isLoading, error, refetch } = useAnalytics(timePeriod);

  // Fetch accounts and categories for filters
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    const supabase = createClient();
    
    try {
      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');
      
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    } catch (error) {

    }
  };

  // Calculate key metrics from real data
  const keyMetrics: KeyMetric[] = [
    {
      label: 'Avg Monthly Income',
      value: summary ? formatCurrency(summary.avgMonthlyIncome) : '-',
      change: summary?.incomeChange || 0,
      trend: summary && summary.incomeChange > 0 ? 'up' : summary && summary.incomeChange < 0 ? 'down' : 'neutral',
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      label: 'Avg Monthly Expenses',
      value: summary ? formatCurrency(summary.avgMonthlyExpenses) : '-',
      change: summary?.expenseChange || 0,
      trend: summary && summary.expenseChange > 0 ? 'up' : summary && summary.expenseChange < 0 ? 'down' : 'neutral',
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      label: 'Avg Savings Rate',
      value: summary ? `${summary.avgSavingsRate.toFixed(1)}%` : '-',
      change: summary?.savingsChange || 0,
      trend: summary && summary.savingsChange > 0 ? 'up' : summary && summary.savingsChange < 0 ? 'down' : 'neutral',
      icon: <PiggyBank className="h-4 w-4" />,
    },
    {
      label: 'Top Spending',
      value: topSpending?.name || 'N/A',
      change: 0,
      trend: 'neutral',
      icon: <Store className="h-4 w-4" />,
    },
    {
      label: 'Peak Expense Day',
      value: peakExpenseDay?.label || 'N/A',
      change: 0,
      trend: 'neutral',
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleToggleAccount = (accountId: string) => {
    setFilters((prev) => ({
      ...prev,
      accountIds: prev.accountIds.includes(accountId)
        ? prev.accountIds.filter((id) => id !== accountId)
        : [...prev.accountIds, accountId],
    }));
  };

  const handleToggleCategory = (categoryId: string) => {
    setFilters((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  const handleToggleTransactionType = (type: 'income' | 'expense' | 'transfer') => {
    setFilters((prev) => ({
      ...prev,
      transactionTypes: prev.transactionTypes.includes(type)
        ? prev.transactionTypes.filter((t) => t !== type)
        : [...prev.transactionTypes, type],
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      accountIds: [],
      categoryIds: [],
      transactionTypes: [],
    });
  };

  const handleApplyFilters = () => {
    setFilterDialogOpen(false);
    // Note: The actual filtering would need to be implemented in the analytics hooks
    // For now, we're just managing the filter state
    handleRefresh();
  };

  const activeFilterCount =
    filters.accountIds.length + filters.categoryIds.length + filters.transactionTypes.length;

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <Activity className="h-5 w-5" />
              <p className="font-medium">Error loading analytics: {error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Time Period Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Period:</span>
                <div className="flex items-center gap-1 border rounded-lg p-1">
                  {(['1M', '3M', '6M', '1Y', 'ALL'] as TimePeriod[]).map((period) => (
                    <Button
                      key={period}
                      variant={timePeriod === period ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTimePeriod(period)}
                      className="h-8"
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Button */}
              <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="relative">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge
                        variant="default"
                        className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Analytics Filters</DialogTitle>
                    <DialogDescription>
                      Filter analytics data by accounts, categories, and transaction types
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Accounts Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Accounts</Label>
                        {filters.accountIds.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilters((prev) => ({ ...prev, accountIds: [] }))}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                        {accounts.length === 0 ? (
                          <p className="text-sm text-muted-foreground col-span-2">No accounts found</p>
                        ) : (
                          accounts.map((account) => (
                            <div key={account.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`account-${account.id}`}
                                checked={filters.accountIds.includes(account.id)}
                                onCheckedChange={() => handleToggleAccount(account.id)}
                              />
                              <label
                                htmlFor={`account-${account.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {account.name}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Categories Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Categories</Label>
                        {filters.categoryIds.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilters((prev) => ({ ...prev, categoryIds: [] }))}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                        {categories.length === 0 ? (
                          <p className="text-sm text-muted-foreground col-span-2">No categories found</p>
                        ) : (
                          categories.map((category) => (
                            <div key={category.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`category-${category.id}`}
                                checked={filters.categoryIds.includes(category.id)}
                                onCheckedChange={() => handleToggleCategory(category.id)}
                              />
                              <label
                                htmlFor={`category-${category.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {category.name}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Transaction Types Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Transaction Types</Label>
                        {filters.transactionTypes.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilters((prev) => ({ ...prev, transactionTypes: [] }))}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-4 border rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="type-income"
                            checked={filters.transactionTypes.includes('income')}
                            onCheckedChange={() => handleToggleTransactionType('income')}
                          />
                          <label
                            htmlFor="type-income"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Income
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="type-expense"
                            checked={filters.transactionTypes.includes('expense')}
                            onCheckedChange={() => handleToggleTransactionType('expense')}
                          />
                          <label
                            htmlFor="type-expense"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Expense
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="type-transfer"
                            checked={filters.transactionTypes.includes('transfer')}
                            onCheckedChange={() => handleToggleTransactionType('transfer')}
                          />
                          <label
                            htmlFor="type-transfer"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Transfer
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={handleClearFilters}>
                      Clear All
                    </Button>
                    <Button onClick={handleApplyFilters}>
                      Apply Filters
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Active Filters Display */}
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="timeseries" className="gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Time Series</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Patterns</span>
          </TabsTrigger>
          <TabsTrigger value="merchants" className="gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Merchants</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Key Metrics Cards */}
          {!isLoading && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {keyMetrics.map((metric, index) => (
                  <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                  <div className="text-muted-foreground">{metric.icon}</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.change !== 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : metric.trend === 'down' ? (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      ) : null}
                      <span
                        className={
                          metric.trend === 'up'
                            ? 'text-green-600'
                            : metric.trend === 'down'
                            ? 'text-red-600'
                            : ''
                        }
                      >
                        {metric.change > 0 ? '+' : ''}
                        {metric.change}%
                      </span>
                      <span>from last period</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Financial Health Score */}
          <FinancialHealthScore />

          {/* Quick Overview Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Income vs Expenses</CardTitle>
                <CardDescription>Last {timePeriod === 'ALL' ? '12' : timePeriod}</CardDescription>
              </CardHeader>
              <CardContent>
                <IncomeExpensesChart period={timePeriod} compact />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>By spending amount</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryAnalytics period={timePeriod} compact />
              </CardContent>
            </Card>
          </div>
            </>
          )}
        </TabsContent>

        {/* Time Series Tab */}
        <TabsContent value="timeseries" className="space-y-6">
          <IncomeExpensesChart period={timePeriod} />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <CategoryAnalytics period={timePeriod} />
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <SpendingPatterns period={timePeriod} />
        </TabsContent>

        {/* Merchants Tab */}
        <TabsContent value="merchants" className="space-y-6">
          <MerchantAnalytics period={timePeriod} />
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <AccountAnalytics period={timePeriod} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <CustomReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
