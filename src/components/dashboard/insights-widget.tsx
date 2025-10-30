'use client';

import { useInsights } from '@/hooks/use-insights';
import { InsightsSummary } from '@/components/analytics';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function DashboardInsights() {
  const router = useRouter();
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

  const handleGenerate = async () => {
    try {
      await generateInsights(false); // Don't force regenerate
    } catch (error) {

    }
  };

  const handleViewAll = () => {
    router.push('/insights');
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load insights: {error}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Insights</h2>
          <p className="text-sm text-muted-foreground">
            Personalized recommendations based on your spending
          </p>
        </div>
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
          Generate Insights
        </Button>
      </div>

      <InsightsSummary
        insights={insights}
        onViewAll={handleViewAll}
      />
    </div>
  );
}
