import { Suspense } from 'react';
import { Metadata } from 'next';
import { AnalyticsPageClient } from '@/components/analytics/analytics-page-client';

export const metadata: Metadata = {
  title: 'Analytics | Financial Dashboard',
  description: 'Advanced financial analytics and insights',
};

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into your financial data
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }
      >
        <AnalyticsPageClient />
      </Suspense>
    </div>
  );
}
