'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

interface BudgetProgressProps {
  budget: {
    id: string;
    name: string;
    period_type: string;
    start_date: string;
    end_date: string;
    total_amount: number;
    total_allocated: number;
    total_spent: number;
    spent_percentage: number;
    category_count: number;
  };
  categories?: Array<{
    category_id: string;
    category_name: string;
    category_icon?: string;
    category_color?: string;
    allocated_amount: number;
    spent_amount: number;
    spent_percentage: number;
    status: 'good' | 'on_track' | 'warning' | 'exceeded';
  }>;
  showCategories?: boolean;
  compact?: boolean;
}

export function BudgetProgress({
  budget,
  categories = [],
  showCategories = false,
  compact = false,
}: BudgetProgressProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevSpent, setPrevSpent] = useState(budget.total_spent);

  // Animate when spent amount changes
  useEffect(() => {
    if (budget.total_spent !== prevSpent) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      setPrevSpent(budget.total_spent);
      return () => clearTimeout(timer);
    }
  }, [budget.total_spent, prevSpent]);

  // Calculate days remaining
  const today = new Date();
  const endDate = new Date(budget.end_date);
  const startDate = new Date(budget.start_date);
  const totalDays = differenceInDays(endDate, startDate);
  const daysRemaining = differenceInDays(endDate, today);
  const daysElapsed = totalDays - daysRemaining;
  const daysPercentage = (daysElapsed / totalDays) * 100;

  // Calculate spending velocity (compared to time elapsed)
  const expectedSpending = (budget.total_allocated * daysPercentage) / 100;
  const spendingVelocity = budget.total_spent - expectedSpending;
  const isOverpacing = spendingVelocity > 0;

  // Determine status color
  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'red';
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'yellow';
    return 'green';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 100) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Over Budget
        </Badge>
      );
    }
    if (percentage >= 90) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Critical
        </Badge>
      );
    }
    if (percentage >= 70) {
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
        <CheckCircle className="h-3 w-3" />
        On Track
      </Badge>
    );
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return Icons.DollarSign;
    return (Icons as any)[iconName] || Icons.DollarSign;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{budget.name}</span>
          {getStatusBadge(budget.spent_percentage)}
        </div>
        <Progress
          value={Math.min(budget.spent_percentage, 100)}
          className="h-2"
          indicatorClassName={`${getProgressColor(budget.spent_percentage)} transition-all duration-500 ${
            isAnimating ? 'scale-105' : ''
          }`}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            ${budget.total_spent.toLocaleString()} / ${budget.total_allocated.toLocaleString()}
          </span>
          <span>{budget.spent_percentage.toFixed(1)}%</span>
        </div>
      </div>
    );
  }

  return (
    <Card className={isAnimating ? 'ring-2 ring-primary transition-all' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{budget.name}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize">
              {budget.period_type} Budget
            </p>
          </div>
          {getStatusBadge(budget.spent_percentage)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{budget.spent_percentage.toFixed(1)}%</span>
          </div>
          <Progress
            value={Math.min(budget.spent_percentage, 100)}
            className="h-3"
            indicatorClassName={`${getProgressColor(budget.spent_percentage)} transition-all duration-700 ${
              isAnimating ? 'animate-pulse' : ''
            }`}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              ${budget.total_spent.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              of ${budget.total_allocated.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Remaining */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg font-bold">
              ${(budget.total_allocated - budget.total_spent).toLocaleString()}
            </p>
          </div>

          {/* Days Remaining */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Days Left</p>
            </div>
            <p className="text-lg font-bold">{daysRemaining}</p>
            <p className="text-xs text-muted-foreground">
              of {totalDays} days
            </p>
          </div>

          {/* Spending Velocity */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Velocity</p>
            </div>
            <div className="flex items-center gap-1">
              {isOverpacing ? (
                <>
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  <p className="text-lg font-bold text-red-500">
                    +${Math.abs(spendingVelocity).toLocaleString()}
                  </p>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <p className="text-lg font-bold text-green-500">
                    -${Math.abs(spendingVelocity).toLocaleString()}
                  </p>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isOverpacing ? 'Over pace' : 'Under pace'}
            </p>
          </div>
        </div>

        {/* Time Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Time Elapsed</span>
            <span>{daysPercentage.toFixed(0)}%</span>
          </div>
          <Progress
            value={Math.min(daysPercentage, 100)}
            className="h-1"
            indicatorClassName="bg-muted-foreground/50"
          />
        </div>

        {/* Spending Velocity Warning */}
        {isOverpacing && spendingVelocity > budget.total_allocated * 0.1 && (
          <div className="flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-orange-900">
              <p className="font-medium">Spending faster than expected</p>
              <p className="text-xs text-orange-800 mt-1">
                You're ${Math.abs(spendingVelocity).toLocaleString()} ahead of
                the expected pace for this point in the budget period.
              </p>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {showCategories && categories.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Category Breakdown</p>
            <div className="space-y-2">
              {categories.map((category) => {
                const IconComponent = getIcon(category.category_icon);
                return (
                  <div key={category.category_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <IconComponent
                          className="h-3 w-3"
                          style={{ color: category.category_color || undefined }}
                        />
                        <span className="font-medium">{category.category_name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {category.spent_percentage.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(category.spent_percentage, 100)}
                      className="h-1.5"
                      indicatorClassName={getProgressColor(category.spent_percentage)}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        ${category.spent_amount.toLocaleString()} / $
                        {category.allocated_amount.toLocaleString()}
                      </span>
                      <Badge
                        variant={
                          category.status === 'exceeded'
                            ? 'destructive'
                            : category.status === 'warning'
                            ? 'outline'
                            : 'secondary'
                        }
                        className="h-5 text-xs"
                      >
                        {category.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
