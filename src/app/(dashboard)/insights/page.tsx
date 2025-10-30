import { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { InsightsPageClient } from '@/components/analytics/insights-page-client';

export const metadata: Metadata = {
  title: 'Insights | FMS Dashboard',
  description: 'Personalized financial insights and recommendations',
};

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Insights</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered recommendations to improve your financial health
        </p>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardContent className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        }
      >
        <InsightsPageClient />
      </Suspense>
    </div>
  );
}
