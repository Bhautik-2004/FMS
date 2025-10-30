'use client';

import { useState } from 'react';
import { useInsights } from '@/hooks/use-insights';
import { InsightsList } from '@/components/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  Sparkles,
  TrendingUp,
  PiggyBank,
  Target,
  AlertCircle,
  Activity,
  Calendar,
  Filter,
  Download,
} from 'lucide-react';

type InsightFilter = 'all' | 'spending_pattern' | 'saving_opportunity' | 'budget_recommendation' | 'anomaly' | 'goal_tracking' | 'trend_prediction';

export function InsightsPageClient() {
  const {
    insights,
    loading,
    error,
    fetchInsights,
    generateInsights,
    dismissInsight,
    snoozeInsight,
    markHelpful,
  } = useInsights();

  const [filter, setFilter] = useState<InsightFilter>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('priority');

  const handleGenerate = async () => {
    try {
      await generateInsights(false);
    } catch (error) {

    }
  };

  const handleForceRegenerate = async () => {
    if (confirm('This will regenerate all insights. Are you sure?')) {
      try {
        await generateInsights(true);
      } catch (error) {

      }
    }
  };

  // Filter insights
  const filteredInsights = insights.filter((insight) => {
    if (filter === 'all') return true;
    return insight.type === filter;
  });

  // Sort insights
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Group insights by type
  const insightsByType = {
    spending_pattern: insights.filter((i) => i.type === 'spending_pattern'),
    saving_opportunity: insights.filter((i) => i.type === 'saving_opportunity'),
    budget_recommendation: insights.filter((i) => i.type === 'budget_recommendation'),
    anomaly: insights.filter((i) => i.type === 'anomaly'),
    goal_tracking: insights.filter((i) => i.type === 'goal_tracking'),
    trend_prediction: insights.filter((i) => i.type === 'trend_prediction'),
  };

  // Calculate stats
  const stats = {
    total: insights.length,
    critical: insights.filter((i) => i.priority === 'critical').length,
    high: insights.filter((i) => i.priority === 'high').length,
    actionable: insights.filter((i) => i.actionable).length,
    positive: insights.filter((i) => i.severity === 'positive').length,
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spending_pattern':
        return <Activity className="h-5 w-5" />;
      case 'saving_opportunity':
        return <PiggyBank className="h-5 w-5" />;
      case 'budget_recommendation':
        return <Target className="h-5 w-5" />;
      case 'anomaly':
        return <AlertCircle className="h-5 w-5" />;
      case 'goal_tracking':
        return <TrendingUp className="h-5 w-5" />;
      case 'trend_prediction':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getTypeName = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Failed to Load Insights</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchInsights}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Insights</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.high}</p>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.actionable}</p>
            <p className="text-sm text-muted-foreground">Actionable</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.positive}</p>
            <p className="text-sm text-muted-foreground">Positive</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Insights</CardTitle>
              <CardDescription>
                AI-powered recommendations based on your financial data
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
              <Button
                onClick={handleForceRegenerate}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(value) => setFilter(value as InsightFilter)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Insights</SelectItem>
                  <SelectItem value="spending_pattern">Spending Patterns</SelectItem>
                  <SelectItem value="saving_opportunity">Saving Opportunities</SelectItem>
                  <SelectItem value="budget_recommendation">Budget Recommendations</SelectItem>
                  <SelectItem value="anomaly">Anomalies</SelectItem>
                  <SelectItem value="goal_tracking">Goal Tracking</SelectItem>
                  <SelectItem value="trend_prediction">Predictions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'priority' | 'date')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Insights Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="all">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="spending_pattern">
            Patterns ({insightsByType.spending_pattern.length})
          </TabsTrigger>
          <TabsTrigger value="saving_opportunity">
            Savings ({insightsByType.saving_opportunity.length})
          </TabsTrigger>
          <TabsTrigger value="budget_recommendation">
            Budgets ({insightsByType.budget_recommendation.length})
          </TabsTrigger>
          <TabsTrigger value="anomaly">
            Anomalies ({insightsByType.anomaly.length})
          </TabsTrigger>
          <TabsTrigger value="goal_tracking">
            Goals ({insightsByType.goal_tracking.length})
          </TabsTrigger>
          <TabsTrigger value="trend_prediction">
            Predictions ({insightsByType.trend_prediction.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <InsightsList
            insights={sortedInsights}
            onDismiss={dismissInsight}
            onSnooze={snoozeInsight}
            onMarkHelpful={markHelpful}
          />
        </TabsContent>

        {Object.entries(insightsByType).map(([type, typeInsights]) => (
          <TabsContent key={type} value={type}>
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {getTypeIcon(type)}
                  <div>
                    <CardTitle>{getTypeName(type)}</CardTitle>
                    <CardDescription>
                      {typeInsights.length} insight{typeInsights.length !== 1 ? 's' : ''} in this category
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <InsightsList
              insights={typeInsights}
              onDismiss={dismissInsight}
              onSnooze={snoozeInsight}
              onMarkHelpful={markHelpful}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
