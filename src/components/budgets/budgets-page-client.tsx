'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign,
  Target,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
} from 'lucide-react';
import * as Icons from 'lucide-react';

interface BudgetSummary {
  budget_id: string;
  user_id: string;
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  is_active: boolean;
  total_allocated: number;
  total_spent: number;
  unallocated: number;
  spent_percentage: number;
  category_count: number;
  over_budget_count: number;
}

interface BudgetCategoryPerformance {
  id: string;
  budget_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  allocated_amount: number;
  spent_amount: number;
  remaining: number;
  spent_percentage: number;
  status: 'good' | 'on_track' | 'warning' | 'exceeded';
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface BudgetsPageClientProps {
  budgets: BudgetSummary[];
  budgetCategories: BudgetCategoryPerformance[];
  categories: Category[];
  tablesExist?: boolean;
}

export function BudgetsPageClient({
  budgets: initialBudgets,
  budgetCategories,
  categories,
  tablesExist = true,
}: BudgetsPageClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [budgets, setBudgets] = useState<BudgetSummary[]>(initialBudgets);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [expandedBudget, setExpandedBudget] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetSummary | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get status based on spent percentage
  const getBudgetStatus = (spentPercentage: number, overBudgetCount: number) => {
    if (overBudgetCount > 0 || spentPercentage >= 100) return 'exceeded';
    if (spentPercentage >= 80) return 'warning';
    if (spentPercentage >= 50) return 'on_track';
    return 'good';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'on_track': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get progress bar color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Filter budgets
  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = budget.name.toLowerCase().includes(searchQuery.toLowerCase());
    const status = getBudgetStatus(budget.spent_percentage, budget.over_budget_count);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const matchesPeriod = periodFilter === 'all' || budget.period_type === periodFilter;
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  // Get categories for a budget
  const getBudgetCategories = (budgetId: string) => {
    return budgetCategories.filter(bc => bc.budget_id === budgetId);
  };

  // Get icon component
  const getIcon = (iconName?: string) => {
    if (!iconName) return Icons.DollarSign;
    return (Icons as any)[iconName] || Icons.DollarSign;
  };

  // Handle delete budget
  const handleDeleteBudget = async () => {
    if (!selectedBudget) return;
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('budgets')
        .delete()
        .eq('id', selectedBudget.budget_id);

      if (error) throw error;

      setBudgets(budgets.filter(b => b.budget_id !== selectedBudget.budget_id));
      setShowDeleteDialog(false);
      setSelectedBudget(null);
      toast.success('Budget deleted successfully');
      router.refresh();
    } catch (error: any) {

      toast.error(error.message || 'Failed to delete budget');
    } finally {
      setIsLoading(false);
    }
  };

  // Show setup message if tables don't exist
  if (!tablesExist) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
            <p className="text-muted-foreground">
              Track and manage your spending budgets
            </p>
          </div>
        </div>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="h-5 w-5" />
              Database Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-orange-900">
              The budget tables haven't been created yet. Please run the budget migration to set up the database.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-orange-900">To set up budgets:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-orange-800">
                <li>Go to your Supabase dashboard: <a href="https://app.supabase.com" target="_blank" className="underline">app.supabase.com</a></li>
                <li>Select your project</li>
                <li>Navigate to the SQL Editor</li>
                <li>Copy the content from: <code className="bg-orange-100 px-1 rounded">supabase/migrations/20250106000000_create_budgets.sql</code></li>
                <li>Paste and run the SQL in the editor</li>
                <li>Refresh this page</li>
              </ol>
            </div>
            <p className="text-sm text-orange-800">
              The migration file is located in your project at: <code className="bg-orange-100 px-1 rounded">d:\FMS-Main\supabase\migrations\20250106000000_create_budgets.sql</code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Track and manage your spending budgets
          </p>
        </div>
        <Link href="/budgets/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Budget
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search budgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="on_track">On Track</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="exceeded">Exceeded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Budget Cards */}
      {filteredBudgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No budgets found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== 'all' || periodFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first budget'}
            </p>
            {!searchQuery && statusFilter === 'all' && periodFilter === 'all' && (
              <Link href="/budgets/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Budget
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredBudgets.map(budget => {
            const status = getBudgetStatus(budget.spent_percentage, budget.over_budget_count);
            const categories = getBudgetCategories(budget.budget_id);
            const isExpanded = expandedBudget === budget.budget_id;

            return (
              <Card key={budget.budget_id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{budget.name}</CardTitle>
                        <Badge variant={budget.is_active ? 'default' : 'secondary'}>
                          {budget.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(status)}>
                          {status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                        </span>
                        <span className="capitalize">{budget.period_type}</span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/budgets/${budget.budget_id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBudget(budget);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Budget</p>
                      <p className="text-2xl font-bold">
                        ${budget.total_amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Allocated</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${budget.total_allocated.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Spent</p>
                      <p className="text-2xl font-bold text-orange-600">
                        ${budget.total_spent.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${(budget.total_allocated - budget.total_spent).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Overall Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-medium">{budget.spent_percentage.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(budget.spent_percentage, 100)} 
                      className="h-3"
                      indicatorClassName={getProgressColor(budget.spent_percentage)}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{budget.category_count} categories</span>
                      {budget.over_budget_count > 0 && (
                        <span className="text-red-600 font-medium">
                          {budget.over_budget_count} over budget
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category Breakdown (Expandable) */}
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-between"
                      onClick={() => setExpandedBudget(isExpanded ? null : budget.budget_id)}
                    >
                      <span className="font-medium">Category Breakdown</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>

                    {isExpanded && (
                      <div className="mt-4 space-y-3">
                        {categories.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No categories allocated
                          </p>
                        ) : (
                          categories.map(category => {
                            const IconComponent = getIcon(category.category_icon);
                            return (
                              <div key={category.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <IconComponent 
                                      className="h-4 w-4" 
                                      style={{ color: category.category_color || undefined }}
                                    />
                                    <span className="font-medium">{category.category_name}</span>
                                    <Badge variant="outline" className={getStatusColor(category.status)}>
                                      {category.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <p className="text-sm font-medium">
                                        ${category.spent_amount.toFixed(2)} / ${category.allocated_amount.toFixed(2)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        ${category.remaining.toFixed(2)} remaining
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => router.push(`/transactions?category=${category.id}`)}
                                      title="Add transaction for this category"
                                    >
                                      <PlusCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Progress 
                                    value={Math.min(category.spent_percentage, 100)}
                                    className="h-2"
                                    indicatorClassName={getProgressColor(category.spent_percentage)}
                                  />
                                  <p className="text-xs text-muted-foreground text-right">
                                    {category.spent_percentage.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBudget?.name}"? This action cannot be undone.
              All category allocations and alerts will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
