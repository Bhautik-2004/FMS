'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/currency-context';
import { Check, X, Edit2, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function RecurringHistory() {
  const [loading] = useState(false);
  const { formatCurrency } = useCurrency();

  // Mock data - replace with actual API call
  const history = [
    {
      id: '1',
      recurring_name: 'Netflix Subscription',
      expected_date: '2025-10-15',
      actual_date: '2025-10-15',
      expected_amount: 15.99,
      actual_amount: 15.99,
      status: 'generated',
      type: 'expense',
      variance: 0,
    },
    {
      id: '2',
      recurring_name: 'Salary',
      expected_date: '2025-10-01',
      actual_date: '2025-10-01',
      expected_amount: 5000,
      actual_amount: 5000,
      status: 'generated',
      type: 'income',
      variance: 0,
    },
    {
      id: '3',
      recurring_name: 'Gym Membership',
      expected_date: '2025-10-10',
      actual_date: null,
      expected_amount: 45,
      actual_amount: null,
      status: 'skipped',
      type: 'expense',
      variance: 0,
    },
    {
      id: '4',
      recurring_name: 'Spotify Premium',
      expected_date: '2025-10-05',
      actual_date: '2025-10-05',
      expected_amount: 9.99,
      actual_amount: 11.99,
      status: 'modified',
      type: 'expense',
      variance: 2,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statusIcons = {
    generated: <Check className="h-4 w-4 text-green-600" />,
    skipped: <X className="h-4 w-4 text-gray-600" />,
    modified: <Edit2 className="h-4 w-4 text-blue-600" />,
    pending: <TrendingUp className="h-4 w-4 text-orange-600" />,
  };

  const statusColors = {
    generated: 'bg-green-100 text-green-800',
    skipped: 'bg-gray-100 text-gray-800',
    modified: 'bg-blue-100 text-blue-800',
    pending: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h) => h.status === 'generated').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h) => h.status === 'modified').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skipped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h) => h.status === 'skipped').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(history.reduce((sum, h) => sum + (h.variance || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Status Icon */}
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    item.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                  )}
                >
                  {item.type === 'income' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{item.recurring_name}</h3>
                    <Badge
                      variant="outline"
                      className={cn('capitalize', statusColors[item.status as keyof typeof statusColors])}
                    >
                      <span className="mr-1">{statusIcons[item.status as keyof typeof statusIcons]}</span>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Expected: {format(new Date(item.expected_date), 'MMM dd, yyyy')}</span>
                    {item.actual_date && (
                      <>
                        <span>•</span>
                        <span>Actual: {format(new Date(item.actual_date), 'MMM dd, yyyy')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount Info */}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      Expected: {formatCurrency(item.expected_amount)}
                    </div>
                    {item.actual_amount !== null && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <div
                          className={cn(
                            'font-semibold',
                            item.variance > 0 ? 'text-red-600' : item.variance < 0 ? 'text-green-600' : ''
                          )}
                        >
                          {formatCurrency(item.actual_amount)}
                        </div>
                      </>
                    )}
                  </div>
                  {item.variance !== 0 && item.actual_amount !== null && (
                    <div
                      className={cn(
                        'text-sm font-medium',
                        item.variance > 0 ? 'text-red-600' : 'text-green-600'
                      )}
                    >
                      {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)} variance
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
