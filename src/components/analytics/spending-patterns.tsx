'use client';

import { useEffect, useState } from 'react';
import { useCurrency } from '@/contexts/currency-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Calendar, AlertTriangle, Info } from 'lucide-react';

interface Props {
  period: string;
}

export function SpendingPatterns({ period }: Props) {
  const [peakDay, setPeakDay] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/analytics/patterns?period=${period}`);
        const data = await res.json();
        setPeakDay(data.peakExpenseDay);
        setAnomalies(data.anomalies || []);
      } catch (error) {

      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Peak Expense Day */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Peak Expense Day
          </CardTitle>
          <CardDescription>Day of month with highest expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : peakDay ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{peakDay.label}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Typically your highest spending day
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-red-600">
                    {formatCurrency(peakDay.totalAmount)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total spent</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg mt-4">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  Consider budgeting extra for expenses around this time of the month.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No pattern data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Spending Anomalies
          </CardTitle>
          <CardDescription>Unusual transactions detected</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : anomalies.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No unusual spending detected - great job staying consistent!
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.slice(0, 10).map((anomaly, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{anomaly.category_name}</span>
                      <Badge
                        variant={
                          anomaly.severity === 'critical'
                            ? 'destructive'
                            : anomaly.severity === 'high'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {anomaly.merchant_name} • {new Date(anomaly.transaction_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {anomaly.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">
                      {formatCurrency(Number(anomaly.amount))}
                    </div>
                    {anomaly.deviation_percentage && (
                      <p className="text-xs text-muted-foreground">
                        {anomaly.deviation_percentage > 0 ? '+' : ''}
                        {anomaly.deviation_percentage.toFixed(0)}% from avg
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
