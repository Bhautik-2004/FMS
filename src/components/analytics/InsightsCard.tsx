'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  PiggyBank,
  Target,
  Activity,
  DollarSign,
  Calendar,
  Bell,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Insight, InsightAction } from '@/lib/analytics/insights';

interface InsightsCardProps {
  insight: Insight;
  onDismiss?: (insightId: string) => void;
  onSnooze?: (insightId: string, days: number) => void;
  onMarkHelpful?: (insightId: string, helpful: boolean) => void;
  compact?: boolean;
}

export function InsightsCard({
  insight,
  onDismiss,
  onSnooze,
  onMarkHelpful,
  compact = false,
}: InsightsCardProps) {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleAction = (action: InsightAction) => {
    switch (action.action) {
      case 'create_budget':
        router.push(`/budgets?action=create${action.params ? `&${new URLSearchParams(action.params as any).toString()}` : ''}`);
        break;
      case 'view_transactions':
        router.push(`/transactions${action.params ? `?${new URLSearchParams(action.params as any).toString()}` : ''}`);
        break;
      case 'view_category':
        router.push(`/categories${action.params?.categoryId ? `?category=${action.params.categoryId}` : ''}`);
        break;
      case 'view_merchant':
        router.push(`/transactions?merchant=${encodeURIComponent(action.params?.merchant || '')}`);
        break;
      case 'adjust_budget':
        router.push(`/budgets?budgetId=${action.params?.budgetId}&action=edit`);
        break;
      case 'set_goal':
        router.push(`/dashboard?action=set-goal${action.params ? `&amount=${action.params.amount}` : ''}`);
        break;
      case 'view_analytics':
        router.push(`/analytics${action.params?.tab ? `?tab=${action.params.tab}` : ''}`);
        break;
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.(insight.id);
  };

  const handleSnooze = (days: number) => {
    setIsDismissed(true);
    onSnooze?.(insight.id, days);
  };

  const getIcon = () => {
    const iconClass = "h-5 w-5";
    
    if (insight.type === 'spending_pattern') {
      return <Activity className={iconClass} />;
    } else if (insight.type === 'saving_opportunity') {
      return <PiggyBank className={iconClass} />;
    } else if (insight.type === 'budget_recommendation') {
      return <Target className={iconClass} />;
    } else if (insight.type === 'anomaly') {
      return <AlertCircle className={iconClass} />;
    } else if (insight.type === 'goal_tracking') {
      return <TrendingUp className={iconClass} />;
    } else if (insight.type === 'trend_prediction') {
      return <Calendar className={iconClass} />;
    }
    
    return <Lightbulb className={iconClass} />;
  };

  const getSeverityColor = () => {
    switch (insight.severity) {
      case 'positive':
        return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'negative':
        return 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'warning':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'neutral':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  const getPriorityBadge = () => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };

    return (
      <Badge variant="outline" className={`${colors[insight.priority]} border-0`}>
        {insight.priority}
      </Badge>
    );
  };

  if (compact) {
    return (
      <div
        className={`p-4 rounded-lg border ${getSeverityColor()} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => setShowActions(!showActions)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{insight.title}</h4>
              {getPriorityBadge()}
            </div>
            <p className="text-sm opacity-90">{insight.description}</p>
            {insight.actions && insight.actions.length > 0 && (
              <div className="flex gap-2 mt-2">
                {insight.actions.slice(0, 2).map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(action);
                    }}
                    className="h-7 text-xs"
                  >
                    {action.label}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                ))}
              </div>
            )}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`${getSeverityColor()} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-full bg-background/50">{getIcon()}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CardTitle className="text-lg">{insight.title}</CardTitle>
                {getPriorityBadge()}
              </div>
              <CardDescription className="text-sm">
                {new Date(insight.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{insight.description}</p>

        {insight.value !== undefined && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
            <DollarSign className="h-5 w-5" />
            <div>
              <p className="text-xs text-muted-foreground">Value</p>
              <p className="font-semibold">
                {typeof insight.value === 'number'
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(insight.value)
                  : insight.value}
              </p>
            </div>
          </div>
        )}

        {insight.actions && insight.actions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Actions</p>
            <div className="flex flex-wrap gap-2">
              {insight.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="default"
                  size="sm"
                  onClick={() => handleAction(action)}
                  className="gap-2"
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {onSnooze && (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSnooze(1)}
                  className="gap-1"
                >
                  <Clock className="h-3 w-3" />
                  1 day
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSnooze(7)}
                  className="gap-1"
                >
                  <Clock className="h-3 w-3" />
                  1 week
                </Button>
              </div>
            )}
          </div>

          {onMarkHelpful && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkHelpful(insight.id, true)}
                className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <ThumbsUp className="h-4 w-4" />
                Helpful
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkHelpful(insight.id, false)}
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <ThumbsDown className="h-4 w-4" />
                Not helpful
              </Button>
            </div>
          )}
        </div>

        {insight.expiresAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <Bell className="h-3 w-3" />
            Expires {new Date(insight.expiresAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Container for multiple insights
interface InsightsListProps {
  insights: Insight[];
  onDismiss?: (insightId: string) => void;
  onSnooze?: (insightId: string, days: number) => void;
  onMarkHelpful?: (insightId: string, helpful: boolean) => void;
  compact?: boolean;
  limit?: number;
}

export function InsightsList({
  insights,
  onDismiss,
  onSnooze,
  onMarkHelpful,
  compact = false,
  limit,
}: InsightsListProps) {
  const displayInsights = limit ? insights.slice(0, limit) : insights;

  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Insights Available</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            We're analyzing your financial data. Check back soon for personalized insights and
            recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {displayInsights.map((insight) => (
        <InsightsCard
          key={insight.id}
          insight={insight}
          onDismiss={onDismiss}
          onSnooze={onSnooze}
          onMarkHelpful={onMarkHelpful}
          compact={compact}
        />
      ))}
    </div>
  );
}

// Summary widget for dashboard
interface InsightsSummaryProps {
  insights: Insight[];
  onViewAll?: () => void;
}

export function InsightsSummary({ insights, onViewAll }: InsightsSummaryProps) {
  const priorityInsights = insights.filter(
    (i) => i.priority === 'critical' || i.priority === 'high'
  ).slice(0, 3);

  const stats = {
    total: insights.length,
    critical: insights.filter((i) => i.priority === 'critical').length,
    high: insights.filter((i) => i.priority === 'high').length,
    positive: insights.filter((i) => i.severity === 'positive').length,
    warnings: insights.filter((i) => i.severity === 'warning' || i.severity === 'negative').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Financial Insights</CardTitle>
            <CardDescription>Personalized recommendations for you</CardDescription>
          </div>
          {onViewAll && (
            <Button variant="outline" size="sm" onClick={onViewAll}>
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Insights</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.positive}</p>
            <p className="text-xs text-muted-foreground">Positive</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.warnings}</p>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
        </div>

        {priorityInsights.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Priority Insights</h4>
            <InsightsList insights={priorityInsights} compact />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
